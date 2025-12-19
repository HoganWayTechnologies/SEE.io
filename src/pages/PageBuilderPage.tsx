import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import SiteNav from '../components/SiteNav'

type BuilderState = {
  draft: any | null
  published: any | null
  catalog: any | null
  history: any[] | null
  status: string | null
}

const defaultBlockPalette = [
  { type: 'hero', label: 'Hero Banner', description: 'Large visual entry with CTA', icon: '🦸' },
  { type: 'text', label: 'Rich Text', description: 'Paragraphs, updates, recaps', icon: '📝' },
  { type: 'image', label: 'Spotlight Image', description: 'Single image with caption', icon: '🖼️' },
  { type: 'gallery', label: 'Gallery', description: 'Multiple media tiles', icon: '📸' },
  { type: 'cta', label: 'Call To Action', description: 'Highlight links or sponsors', icon: '🎯' },
  { type: 'faq', label: 'FAQ', description: 'Answer attendee questions', icon: '❓' },
  { type: 'tickets', label: 'Tickets Block', description: 'Promote ticket tiers', icon: '🎟️' }
]

export default function PageBuilderPage() {
  const { eventId } = useParams()
  const auth = useAuth()
  const businessId = useMemo(() => {
    return (
      auth.primaryBusinessId ||
      auth.profile?.primaryBusinessId ||
      auth.profile?.businessId ||
      auth.profile?.business?.id ||
      auth.profile?.business?.businessId ||
      null
    )
  }, [auth.primaryBusinessId, auth.profile])
  const [builder, setBuilder] = useState<BuilderState>({
    draft: null,
    published: null,
    catalog: null,
    history: null,
    status: 'Loading...'
  })
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [previewToken, setPreviewToken] = useState<string | null>(null)
  const [usage, setUsage] = useState<any | null>(null)
  const [media, setMedia] = useState<any[]>([])
  const [mediaStatus, setMediaStatus] = useState<string | null>(null)
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null)
  const [draftBlocks, setDraftBlocks] = useState<any[]>([])
  const [theme, setTheme] = useState<string>('default')
  const [palette, setPalette] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('seeBuilderOnboarded') !== '1'
  })
  const dismissOnboarding = () => {
    setShowOnboarding(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('seeBuilderOnboarded', '1')
    }
  }

  const paletteBlocks = useMemo(() => {
    if (builder.catalog?.blocks && builder.catalog.blocks.length > 0) return builder.catalog.blocks
    return defaultBlockPalette
  }, [builder.catalog])

  const heroMediaIds = useMemo(() => {
    return new Set(
      media
        .map(item => ({
          id: item?.id || item?.mediaId || null,
          purposes: Array.isArray(item?.purposes) ? item.purposes : []
        }))
        .filter(item => item.id && item.purposes.some((p: string) => (p || '').toLowerCase() === 'hero'))
        .map(item => item.id as string)
    )
  }, [media])

  const normalizeBlock = useCallback((block: any) => ({
    ...block,
    id: block.id || block.Id || crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    type: block.type || block.Type,
    order: block.order ?? block.Order ?? 0,
    settings: block.settings || block.Settings || {}
  }), [])

  const reloadBuilder = useCallback(async () => {
    if (!eventId || !auth.idToken) {
      setBuilder(prev => ({ ...prev, status: 'Sign in to edit pages.' }))
      return
    }
    try {
      const [page, catalog, history, usageResp, mediaResp] = await Promise.all([
        api.fetchEventPage(eventId, auth.idToken, businessId || undefined),
        api.fetchEventPageCatalog(eventId, auth.idToken, businessId || undefined),
        api.fetchPageHistory(eventId, auth.idToken, businessId || undefined),
        api.fetchPageUsage(eventId, auth.idToken, businessId || undefined),
        api.fetchEventMedia(eventId, auth.idToken, businessId || undefined)
      ])
      const draft = page?.draft || page?.Draft || null
      const published = page?.published || page?.Published || null
      const histItems =
        (Array.isArray(history?.items) && history.items) ||
        (Array.isArray((history as any)?.Items) && (history as any).Items) ||
        history ||
        []
      setBuilder({
        draft,
        published,
        catalog: catalog || null,
        history: Array.isArray(histItems) ? histItems : [],
        status: null
      })
      setUsage(usageResp || null)
      const mediaItems =
        (Array.isArray(mediaResp?.items) && mediaResp.items) ||
        (Array.isArray((mediaResp as any)?.Items) && (mediaResp as any).Items) ||
        (Array.isArray(mediaResp) ? mediaResp : [])
      setMedia(mediaItems)
      setDraftBlocks((draft?.blocks || draft?.Blocks || []).map(normalizeBlock))
      setTheme(draft?.theme || draft?.Theme || 'default')
      setPalette(draft?.palette || draft?.Palette || null)
    } catch (err: any) {
      setBuilder(prev => ({ ...prev, status: err?.message || 'Failed to load builder' }))
    }
  }, [eventId, auth.idToken, businessId, normalizeBlock])

  useEffect(() => {
    reloadBuilder()
  }, [reloadBuilder])

  const handlePublish = async () => {
    if (!eventId || !auth.idToken) return
    setSaveStatus('Publishing...')
    try {
      await api.publishEventPage(
        eventId,
        { expectedRevision: builder.draft?.revision || builder.draft?.Revision || null },
        auth.idToken,
        businessId || undefined
      )
      setSaveStatus('Published!')
      await reloadBuilder()
    } catch (err: any) {
      setSaveStatus(err?.message || 'Publish failed')
    }
  }

  const handleSave = async () => {
    if (!eventId || !auth.idToken) return
    setSaveStatus('Saving draft...')
    try {
      await api.saveEventPage(
        eventId,
        {
          theme,
          palette,
          expectedRevision: builder.draft?.revision || builder.draft?.Revision || null,
          blocks: draftBlocks.map((b, idx) => ({ ...b, order: idx }))
        },
        auth.idToken,
        businessId || undefined
      )
      setSaveStatus('Draft saved')
      await reloadBuilder()
    } catch (err: any) {
      setSaveStatus(err?.message || 'Save failed')
    }
  }

  const handlePreview = async () => {
    if (!eventId || !auth.idToken) return
    setSaveStatus('Generating preview...')
    try {
      const tokenResp = await api.requestPagePreviewToken(
        eventId,
        { expectedRevision: builder.draft?.revision || builder.draft?.Revision || null },
        auth.idToken,
        businessId || undefined
      )
      setPreviewToken(tokenResp?.token || tokenResp?.previewToken || null)
      setSaveStatus('Preview link ready')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Preview failed')
    }
  }

  const handleRevokePreview = async () => {
    if (!eventId || !auth.idToken || !previewToken) return
    setSaveStatus('Revoking preview…')
    try {
      await api.revokePagePreviewToken(eventId, previewToken, auth.idToken, businessId || undefined)
      setPreviewToken(null)
      setSaveStatus('Preview link revoked.')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Unable to revoke preview link')
    }
  }

  const handleDiscardDraft = async () => {
    if (!eventId || !auth.idToken) return
    setSaveStatus('Discarding draft...')
    try {
      const resp = await api.discardPageDraft(eventId, auth.idToken, businessId || undefined)
      const draft = resp?.draft || resp?.Draft || null
      setBuilder(prev => ({ ...prev, draft }))
      setDraftBlocks((draft?.blocks || draft?.Blocks || []).map((b: any) => ({
        ...b,
        id: b.id || b.Id || crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      })))
      setSaveStatus('Draft discarded; reverted to last published.')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Discard failed')
    }
  }

  const handleRestore = async (versionId: string) => {
    if (!eventId || !auth.idToken) return
    setSaveStatus('Restoring version...')
    try {
      await api.restorePageVersion(eventId, versionId, {}, auth.idToken, businessId || undefined)
      await reloadBuilder()
      setSaveStatus('Version restored to draft')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Restore failed')
    }
  }

  const uploadMedia = async (file?: File) => {
    if (!eventId || !auth.idToken || !file) return
    setMediaStatus('Uploading...')
    try {
      const uploaded = await api.uploadEventMedia(eventId, file, auth.idToken, businessId || undefined)
      setMedia(prev => [uploaded, ...prev])
      setMediaStatus('Uploaded')
    } catch (err: any) {
      setMediaStatus(err?.message || 'Upload failed')
    }
  }

  const promoteHeroImage = async (mediaId: string) => {
    if (!eventId || !auth.idToken || !mediaId) return
    setMediaStatus('Setting hero image...')
    try {
      await api.promoteEventHero(eventId, mediaId, auth.idToken, businessId || undefined)
      setMediaStatus('Hero image updated.')
      await reloadBuilder()
    } catch (err: any) {
      setMediaStatus(err?.message || 'Failed to update hero image')
    }
  }

  const defaultSettingsForType = (type: string) => {
    switch (type) {
      case 'hero':
        return { heading: 'Hero title', subheading: 'Describe your event', cta: 'Get tickets', link: '#' }
      case 'text':
        return { text: 'New text block' }
      case 'image':
        return { mediaId: media[0]?.id || media[0]?.mediaId || null, alt: 'Image' }
      case 'cta':
        return { heading: 'Call to action', body: 'Add supporting text', button: 'Click', link: '#' }
      case 'faq':
        return { items: [{ q: 'Question?', a: 'Answer.' }] }
      case 'tickets':
        return { title: 'Tickets', description: 'Select your ticket type' }
      case 'gallery':
        return { mediaIds: media.slice(0, 3).map(m => m.id || m.mediaId).filter(Boolean) }
      default:
        return {}
    }
  }

  const addBlock = (type: string) => {
    const newBlock = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      type,
      order: draftBlocks.length,
      settings: defaultSettingsForType(type),
      children: []
    }
    setDraftBlocks(prev => [...prev, newBlock])
  }

  const updateBlockSetting = (blockId: string, key: string, value: string) => {
    setDraftBlocks(prev => prev.map(b => b.id === blockId ? { ...b, settings: { ...(b.settings || {}), [key]: value } } : b))
  }

  const removeBlock = (blockId: string) => {
    setDraftBlocks(prev => prev.filter(b => b.id !== blockId))
  }

  const reorderBlocks = useCallback((blocks: any[], sourceId: string, targetId: string) => {
    const sourceIndex = blocks.findIndex(b => b.id === sourceId)
    const targetIndex = blocks.findIndex(b => b.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return blocks
    const updated = [...blocks]
    const [moved] = updated.splice(sourceIndex, 1)
    updated.splice(targetIndex, 0, moved)
    return updated.map((block, index) => ({ ...block, order: index }))
  }, [])

  const handleDragOverBlock = useCallback(
    (targetId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (!draggingId || draggingId === targetId) return
      setDraftBlocks(prev => reorderBlocks(prev, draggingId, targetId))
    },
    [draggingId, reorderBlocks]
  )

  const handleDragStart = (blockId: string) => () => setDraggingId(blockId)
  const handleDragEnd = () => setDraggingId(null)

  const renderBlockEditor = (block: any) => {
    const settings = block.settings || {}
    switch (block.type) {
      case 'hero':
        return (
          <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
            <input className="form-input" value={settings.heading || ''} onChange={(e) => updateBlockSetting(block.id, 'heading', e.target.value)} placeholder="Heading" />
            <input className="form-input" value={settings.subheading || ''} onChange={(e) => updateBlockSetting(block.id, 'subheading', e.target.value)} placeholder="Subheading" />
            <input className="form-input" value={settings.cta || ''} onChange={(e) => updateBlockSetting(block.id, 'cta', e.target.value)} placeholder="CTA text" />
            <input className="form-input" value={settings.link || ''} onChange={(e) => updateBlockSetting(block.id, 'link', e.target.value)} placeholder="CTA link" />
          </div>
        )
      case 'text':
        return (
          <textarea className="form-input" rows={3} value={settings.text || ''} onChange={(e) => updateBlockSetting(block.id, 'text', e.target.value)} />
        )
      case 'image':
        return (
          <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
            <select className="form-input" value={settings.mediaId || ''} onChange={(e) => updateBlockSetting(block.id, 'mediaId', e.target.value)}>
              <option value="">Select media</option>
              {media.map(item => (
                <option key={item.id || item.mediaId} value={item.id || item.mediaId}>{item.fileName || item.name || item.url}</option>
              ))}
            </select>
            <input className="form-input" placeholder="Alt text" value={settings.alt || ''} onChange={(e) => updateBlockSetting(block.id, 'alt', e.target.value)} />
          </div>
        )
      case 'cta':
        return (
          <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
            <input className="form-input" value={settings.heading || ''} onChange={(e) => updateBlockSetting(block.id, 'heading', e.target.value)} placeholder="Heading" />
            <textarea className="form-input" rows={2} value={settings.body || ''} onChange={(e) => updateBlockSetting(block.id, 'body', e.target.value)} placeholder="Body" />
            <input className="form-input" value={settings.button || ''} onChange={(e) => updateBlockSetting(block.id, 'button', e.target.value)} placeholder="Button text" />
            <input className="form-input" value={settings.link || ''} onChange={(e) => updateBlockSetting(block.id, 'link', e.target.value)} placeholder="Button link" />
          </div>
        )
      case 'faq':
        return (
          <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
            {(settings.items || []).map((item: any, idx: number) => (
              <div key={idx} className="card" style={{ background: 'var(--gray-50)', padding: '0.5rem' }}>
                <input className="form-input" value={item.q || ''} placeholder="Question" onChange={(e) => {
                  const next = [...(settings.items || [])]
                  next[idx] = { ...next[idx], q: e.target.value }
                  updateBlockSetting(block.id, 'items', next)
                }} />
                <textarea className="form-input" rows={2} value={item.a || ''} placeholder="Answer" onChange={(e) => {
                  const next = [...(settings.items || [])]
                  next[idx] = { ...next[idx], a: e.target.value }
                  updateBlockSetting(block.id, 'items', next)
                }} />
              </div>
            ))}
            <button className="btn btn-secondary" onClick={() => updateBlockSetting(block.id, 'items', [...(settings.items || []), { q: 'Question', a: 'Answer' }])}>Add FAQ</button>
          </div>
        )
      case 'gallery':
        return (
          <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
            <small style={{ color: 'var(--gray-600)' }}>Select up to 6 media assets</small>
            <select multiple className="form-input" value={settings.mediaIds || []} onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value)
              updateBlockSetting(block.id, 'mediaIds', opts)
            }}>
              {media.map(item => (
                <option key={item.id || item.mediaId} value={item.id || item.mediaId}>{item.fileName || item.name || item.url}</option>
              ))}
            </select>
          </div>
        )
      default:
        return (
          <textarea
            className="form-input"
            rows={3}
            value={JSON.stringify(settings, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                updateBlockSetting(block.id, '__raw', parsed)
              } catch {
                updateBlockSetting(block.id, '__raw', e.target.value)
              }
            }}
          />
        )
    }
  }

  return (
    <div>
      <SiteNav
        activePath="/publisher"
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/publisher', label: 'Publisher Console' }
        ]}
      />

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Event Page Builder</h1>
          <p style={{ color: 'var(--gray-600)' }}>Manage branding, layout, and custom links for your event page.</p>
        </header>

        {showOnboarding && (
          <div className="card" style={{ marginBottom: '1.25rem', border: '2px solid var(--primary-blue)' }}>
            <div className="card-body">
              <h3 className="card-title">Getting started</h3>
              <ol style={{ color: 'var(--gray-700)', paddingLeft: '1.25rem' }}>
                <li>Select a block from the palette to add it to your draft.</li>
                <li>Drag blocks using the handle to reorder sections.</li>
                <li>Upload media for hero or gallery blocks, then publish to go live.</li>
              </ol>
              <button className="btn btn-primary" onClick={dismissOnboarding}>Got it</button>
            </div>
          </div>
        )}

        {builder.status && <p style={{ color: 'var(--gray-600)' }}>{builder.status}</p>}

        {!builder.status && (
          <div className="grid" style={{ gap: '1rem', gridTemplateColumns: '2fr 1fr' }}>
            <div className="card">
              <div className="card-body">
                <h3 className="card-title">Draft Layout</h3>
                <p style={{ color: 'var(--gray-600)' }}>Edit your blocks and publish to update the live event page.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', margin: '0.5rem 0 1rem 0' }}>
                  {paletteBlocks.map((block: any) => (
                    <button
                      key={block.type}
                      type="button"
                      className="card"
                      onClick={() => addBlock(block.type)}
                      style={{ textAlign: 'left', padding: '0.75rem', cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: '1.25rem' }}>{block.icon || '⬜️'}</div>
                      <div style={{ fontWeight: 600 }}>{block.label || block.type}</div>
                      <div style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                        {block.description || 'Custom content block'}
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 600 }}>Theme</label>
                  <input className="form-input" style={{ maxWidth: '180px' }} value={theme} onChange={(e) => setTheme(e.target.value)} />
                  <input className="form-input" style={{ maxWidth: '180px' }} placeholder="Palette" value={palette || ''} onChange={(e) => setPalette(e.target.value || null)} />
                </div>
                {draftBlocks.length === 0 && <p style={{ color: 'var(--gray-600)' }}>No blocks yet. Start by selecting a block type above.</p>}
                {draftBlocks.map(block => (
                  <div
                    key={block.id}
                    className="card"
                    draggable
                    onDragStart={handleDragStart(block.id)}
                    onDragOver={handleDragOverBlock(block.id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      marginBottom: '0.5rem',
                      background: draggingId === block.id ? 'var(--light-purple)' : 'var(--gray-50)',
                      border: draggingId === block.id ? '1px dashed var(--primary-blue)' : undefined,
                      cursor: 'grab'
                    }}
                  >
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>↕️</span>
                          <strong>{block.type}</strong>
                        </div>
                        <button className="btn btn-secondary" onClick={() => removeBlock(block.id)}>Remove</button>
                      </div>
                      {renderBlockEditor(block)}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={handleSave}>Save Draft</button>
                <button className="btn btn-primary" style={{ marginLeft: '0.5rem' }} onClick={handlePublish}>Publish</button>
                <button className="btn btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={handlePreview}>Preview Link</button>
                  <button className="btn btn-secondary" onClick={handleDiscardDraft}>Discard Draft</button>
                  <button className="btn btn-secondary" onClick={reloadBuilder}>Refresh</button>
                </div>
                {saveStatus && <p style={{ color: 'var(--gray-600)', marginTop: '0.5rem' }}>{saveStatus}</p>}
                {previewToken && (
                  <div className="code-block" style={{ marginTop: '0.5rem' }}>
                    <small>Preview token</small>
                    <code>{previewToken}</code>
                    <div style={{ marginTop: '0.25rem' }}>
                      <Link to={`/event/${eventId}?previewToken=${previewToken}`} className="btn btn-secondary">
                        Open preview
                      </Link>
                      <button className="btn btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={handleRevokePreview}>
                        Revoke
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h3 className="card-title">Branding & Links</h3>
                <ul style={{ color: 'var(--gray-700)', paddingLeft: '1.25rem' }}>
                  <li>Theme colors, hero image, typography from catalog</li>
                  <li>Custom CTA links to ticketing, sponsors, socials</li>
                  <li>Upload media assets and attach to blocks</li>
                </ul>
                <div style={{ marginTop: '0.75rem' }}>
                  <input type="file" onChange={(e) => uploadMedia(e.target.files?.[0])} />
                  {mediaStatus && <div style={{ color: 'var(--gray-600)' }}>{mediaStatus}</div>}
                  {media.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <strong>Media Library</strong>
                      <ul style={{ paddingLeft: '1rem', display: 'grid', gap: '0.5rem' }}>
                        {media.slice(0, 8).map(item => {
                          const mediaId = item.id || item.mediaId || null
                          const key = mediaId || item.url || crypto.randomUUID?.() || Math.random().toString(36).slice(2)
                          const isHero = mediaId ? heroMediaIds.has(mediaId) : false
                          const displayName = item.name || item.fileName || mediaId || item.url
                          return (
                            <li key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <span>{displayName}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {isHero ? (
                                  <span className="badge badge-active">Hero image</span>
                                ) : mediaId ? (
                                  <button
                                    className="btn btn-secondary"
                                    type="button"
                                    onClick={() => promoteHeroImage(mediaId)}
                                  >
                                    Set as hero
                                  </button>
                                ) : (
                                  <span className="badge badge-draft">Cannot promote</span>
                                )}
                              </div>
                            </li>
                          )
                        })}
                        {media.length > 8 && <li style={{ color: 'var(--gray-600)' }}>Showing first 8 items. Uploads with the hero tag will appear here.</li>}
                      </ul>
                    </div>
                  )}
                </div>
                {builder.catalog?.blocks && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <strong>Available Blocks</strong>
                    <ul style={{ paddingLeft: '1rem', color: 'var(--gray-700)' }}>
                      {builder.catalog.blocks.map((b: any) => (
                        <li key={b.type}>{b.label || b.type} — {b.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!builder.status && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>Page History</h3>
                <button className="btn btn-secondary" type="button" onClick={reloadBuilder}>Reload</button>
              </div>
              {builder.history && builder.history.length === 0 && <p style={{ color: 'var(--gray-600)' }}>No published versions yet.</p>}
              {builder.history && builder.history.length > 0 && (
                <ul style={{ paddingLeft: '1.25rem' }}>
                  {builder.history.map((v: any) => (
                    <li key={v.id || v.versionId}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span>{v.publishedAtUtc || v.createdAtUtc} — {v.versionId || v.id}</span>
                        <button className="btn btn-secondary" onClick={() => handleRestore(v.versionId || v.id)}>Restore</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {!builder.status && usage && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-body">
              <h3 className="card-title">Block & Media Usage</h3>
              <pre className="code-block">{JSON.stringify(usage, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
