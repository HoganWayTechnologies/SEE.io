import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import UserMenu from '../components/UserMenu'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

type BuilderState = {
  draft: any | null
  published: any | null
  catalog: any | null
  history: any[] | null
  status: string | null
}

export default function PageBuilderPage() {
  const { eventId } = useParams()
  const auth = useAuth()
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
  const [selectedType, setSelectedType] = useState<string>('hero')

  const catalogBlocks = useMemo(() => builder.catalog?.blocks || [], [builder.catalog])

  useEffect(() => {
    const load = async () => {
      if (!eventId || !auth.idToken) {
        setBuilder(prev => ({ ...prev, status: 'Sign in to edit pages.' }))
        return
      }
      try {
        const [page, catalog, history, usageResp, mediaResp] = await Promise.all([
          api.fetchEventPage(eventId, auth.idToken),
          api.fetchEventPageCatalog(eventId, auth.idToken),
          api.fetchPageHistory(eventId, auth.idToken),
          api.fetchPageUsage(eventId, auth.idToken),
          api.fetchEventMedia(eventId, auth.idToken)
        ])
        setBuilder({
          draft: page?.draft || null,
          published: page?.published || null,
          catalog: catalog || null,
          history: history?.items || history || [],
          status: null
        })
        setUsage(usageResp || null)
        setMedia(Array.isArray(mediaResp?.items) ? mediaResp.items : (mediaResp || []))
        setDraftBlocks(page?.draft?.blocks || [])
        setTheme(page?.draft?.theme || 'default')
        setPalette(page?.draft?.palette || null)
      } catch (err: any) {
        setBuilder(prev => ({ ...prev, status: err?.message || 'Failed to load builder' }))
      }
    }
    load()
  }, [eventId, auth.idToken])

  const handlePublish = async () => {
    if (!eventId || !auth.idToken) return
    setSaveStatus('Publishing...')
    try {
      await api.publishEventPage(eventId, { expectedRevision: builder.draft?.revision || null }, auth.idToken)
      setSaveStatus('Published!')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Publish failed')
    }
  }

  const handleSave = async () => {
    if (!eventId || !auth.idToken) return
    setSaveStatus('Saving draft...')
    try {
      await api.saveEventPage(eventId, {
        theme,
        palette,
        blocks: draftBlocks.map((b, idx) => ({ ...b, order: idx }))
      }, auth.idToken)
      setSaveStatus('Draft saved')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Save failed')
    }
  }

  const handlePreview = async () => {
    if (!eventId || !auth.idToken) return
    setSaveStatus('Generating preview...')
    try {
      const tokenResp = await api.requestPagePreviewToken(eventId, {}, auth.idToken)
      setPreviewToken(tokenResp?.token || tokenResp?.previewToken || null)
      setSaveStatus('Preview link ready')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Preview failed')
    }
  }

  const handleDiscardDraft = async () => {
    if (!eventId || !auth.idToken) return
    setSaveStatus('Discarding draft...')
    try {
      const resp = await api.discardPageDraft(eventId, auth.idToken)
      setBuilder(prev => ({ ...prev, draft: resp?.draft || null }))
      setDraftBlocks(resp?.draft?.blocks || [])
      setSaveStatus('Draft discarded')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Discard failed')
    }
  }

  const handleRestore = async (versionId: string) => {
    if (!eventId || !auth.idToken) return
    setSaveStatus('Restoring version...')
    try {
      await api.restorePageVersion(eventId, versionId, {}, auth.idToken)
      const refreshed = await api.fetchEventPage(eventId, auth.idToken)
      setDraftBlocks(refreshed?.draft?.blocks || [])
      setTheme(refreshed?.draft?.theme || 'default')
      setPalette(refreshed?.draft?.palette || null)
      setSaveStatus('Version restored to draft')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Restore failed')
    }
  }

  const uploadMedia = async (file?: File) => {
    if (!eventId || !auth.idToken || !file) return
    setMediaStatus('Uploading...')
    try {
      const uploaded = await api.uploadEventMedia(eventId, file, auth.idToken)
      setMedia(prev => [uploaded, ...prev])
      setMediaStatus('Uploaded')
    } catch (err: any) {
      setMediaStatus(err?.message || 'Upload failed')
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
      <nav className="nav">
        <div className="container nav-container">
          <Link to="/" className="nav-brand">SEE.io</Link>
          <div className="nav-links">
            <Link to="/discover" className="nav-link">Discover</Link>
            <Link to="/publisher" className="nav-link">Publisher Console</Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Event Page Builder</h1>
          <p style={{ color: 'var(--gray-600)' }}>Manage branding, layout, and custom links for your event page.</p>
        </header>

        {builder.status && <p style={{ color: 'var(--gray-600)' }}>{builder.status}</p>}

        {!builder.status && (
          <div className="grid" style={{ gap: '1rem', gridTemplateColumns: '2fr 1fr' }}>
            <div className="card">
              <div className="card-body">
                <h3 className="card-title">Draft Layout</h3>
                <p style={{ color: 'var(--gray-600)' }}>Edit your blocks and publish to update the live event page.</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                  <select className="form-input" value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ maxWidth: '200px' }}>
                    {catalogBlocks.length === 0 && (
                      <>
                        <option value="hero">Hero</option>
                        <option value="text">Text</option>
                        <option value="image">Image</option>
                        <option value="cta">CTA</option>
                        <option value="faq">FAQ</option>
                        <option value="gallery">Gallery</option>
                      </>
                    )}
                    {catalogBlocks.length > 0 && catalogBlocks.map((b: any) => (
                      <option key={b.type} value={b.type}>{b.label || b.type}</option>
                    ))}
                  </select>
                  <button className="btn btn-secondary" onClick={() => addBlock(selectedType)}>Add Block</button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 600 }}>Theme</label>
                  <input className="form-input" style={{ maxWidth: '180px' }} value={theme} onChange={(e) => setTheme(e.target.value)} />
                  <input className="form-input" style={{ maxWidth: '180px' }} placeholder="Palette" value={palette || ''} onChange={(e) => setPalette(e.target.value || null)} />
                </div>
                {draftBlocks.length === 0 && <p style={{ color: 'var(--gray-600)' }}>No blocks yet.</p>}
                {draftBlocks.map(block => (
                  <div key={block.id} className="card" style={{ marginBottom: '0.5rem', background: 'var(--gray-50)' }}>
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{block.type}</strong>
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
                      <ul style={{ paddingLeft: '1rem' }}>
                        {media.slice(0, 5).map(item => (
                          <li key={item.id || item.mediaId || item.url}>{item.name || item.fileName || item.url}</li>
                        ))}
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
              <h3 className="card-title">Page History</h3>
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
