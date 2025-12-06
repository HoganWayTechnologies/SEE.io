import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SiteNav from '../components/SiteNav'
import { api } from '../services/api'

type BlockPaletteItem = {
  type: string
  label: string
  icon: string
  description?: string
}

const defaultBlockPalette: BlockPaletteItem[] = [
  { type: 'hero', label: 'Hero Banner', description: 'Large visual entry with CTA', icon: '🦸' },
  { type: 'section', label: 'Section', description: 'Group other blocks with a heading', icon: '🧱' },
  { type: 'text', label: 'Rich Text', description: 'Paragraphs, announcements, bios', icon: '📝' },
  { type: 'image', label: 'Spotlight Image', description: 'Single image with caption', icon: '🖼️' },
  { type: 'gallery', label: 'Gallery', description: 'Multiple media tiles', icon: '📸' },
  { type: 'cta', label: 'Call To Action', description: 'Highlight links or offers', icon: '🎯' },
  { type: 'faq', label: 'FAQ', description: 'Answer community questions', icon: '❓' }
]

const computeBusinessId = (
  profile: any,
  routeBusinessId?: string,
  primaryBusinessId?: string | null,
  memberships?: any[]
) => {
  if (routeBusinessId) return routeBusinessId
  if (primaryBusinessId) return primaryBusinessId
  if (memberships?.length) {
    return memberships[0]?.businessId || memberships[0]?.business?.id || null
  }
  return (
    profile?.businessId ||
    profile?.business?.id ||
    profile?.business?.businessId ||
    profile?.publisher?.businessId ||
    profile?.businesses?.[0]?.id ||
    null
  )
}

export default function BusinessPageBuilder() {
  const { businessId: paramBusinessId } = useParams()
  const auth = useAuth()
  const navigate = useNavigate()
  const businessId = computeBusinessId(auth.profile, paramBusinessId, auth.primaryBusinessId, auth.businessMemberships)
  const [status, setStatus] = useState('Loading...')
  const [draftBlocks, setDraftBlocks] = useState<any[]>([])
  const [theme, setTheme] = useState('default')
  const [palette, setPalette] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [usage, setUsage] = useState<any | null>(null)
  const [media, setMedia] = useState<any[]>([])
  const [mediaStatus, setMediaStatus] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [previewToken, setPreviewToken] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<any | null>(null)
  const [draft, setDraft] = useState<any | null>(null)
  const [published, setPublished] = useState<any | null>(null)
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const [paletteModalOpen, setPaletteModalOpen] = useState(false)
  const [paletteEditorColors, setPaletteEditorColors] = useState<{ primary: string; secondary: string }>({
    primary: '#ff5f6d',
    secondary: '#ffc371'
  })

  const ensureList = (value: any): any[] => (Array.isArray(value) ? value : [])

  const normalizeApiBlock = (block: any): any => {
    if (!block) return null
    const normalizedType = (block.type || block.Type || 'custom').toString().toLowerCase()
    return {
      id: block.id || block.Id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
      type: normalizedType,
      order: block.order ?? block.Order ?? 0,
      settings: block.settings || block.Settings || {},
      children: ensureList(block.children || block.Children).map((child) => normalizeApiBlock(child)).filter(Boolean)
    }
  }

  const getBlocksFromVersion = (version: any): any[] => {
    const baseBlocks = ensureList(
      version?.blocks ||
      version?.Blocks ||
      version?.draftBlocks ||
      version?.DraftBlocks ||
      []
    )
    return baseBlocks.map(block => normalizeApiBlock(block)).filter(Boolean)
  }

  const catalogBlockPalette = useMemo(() => {
    const raw = ensureList(catalog?.blocks || catalog?.Blocks)
    if (!raw.length) return []
    return raw
      .map((block: any) => {
        const type = (block?.type || block?.Type || '').toString().toLowerCase()
        if (!type) return null
        return {
          type,
          label: block?.label || block?.Label || block?.displayName || block?.DisplayName || type,
          icon: block?.icon || block?.Icon || '🧩',
          description: block?.description || block?.Description || ''
        }
      })
      .filter(Boolean) as BlockPaletteItem[]
  }, [catalog])

  const blockPalette: BlockPaletteItem[] = useMemo(() => {
    return catalogBlockPalette.length ? catalogBlockPalette : defaultBlockPalette
  }, [catalogBlockPalette])

  const getBlockDefinition = useCallback((type: string) => {
    if (!catalog?.blocks?.length) return null
    return catalog.blocks.find((def: any) => def.type === type) || null
  }, [catalog])

  const reloadBuilder = useCallback(async () => {
    if (!businessId || !auth.idToken) {
      setStatus('Sign in to edit.')
      return
    }
    try {
      const [pageResp, catalogResp, historyResp, usageResp, mediaResp] = await Promise.all([
        api.fetchBusinessPage(businessId, auth.idToken),
        api.fetchBusinessPageCatalog(businessId, auth.idToken),
        api.fetchBusinessPageHistory(businessId, auth.idToken),
        api.fetchBusinessMedia(businessId, auth.idToken) // no usage endpoint? reuse media
      ]).then(([page, catalog, history, media]) => [page, catalog, history, null, media])
      // adapt unpack
      const page = (pageResp as any) || {}
      const draftVersion = page.draft || page.Draft || null
      const publishedVersion = page.published || page.Published || null
      const histItems =
        (Array.isArray((historyResp as any)?.items) && (historyResp as any).items) ||
        (Array.isArray((historyResp as any)?.Items) && (historyResp as any).Items) ||
        historyResp ||
        []
      setCatalog(catalogResp || null)
      setHistory(Array.isArray(histItems) ? histItems : [])
      setDraft(draftVersion)
      setPublished(publishedVersion)
      setDraftBlocks(getBlocksFromVersion(draftVersion))
      setTheme(draftVersion?.theme || draftVersion?.Theme || 'default')
      setPalette(draftVersion?.palette || draftVersion?.Palette || null)
      const mediaItems =
        (Array.isArray((mediaResp as any)?.items) && (mediaResp as any).items) ||
        (Array.isArray((mediaResp as any)?.Items) && (mediaResp as any).Items) ||
        (Array.isArray(mediaResp as any) ? (mediaResp as any) : [])
      setMedia(mediaItems)
      setUsage(usageResp)
      setStatus(null)
    } catch (err: any) {
      setStatus(err?.message || 'Unable to load page builder')
    }
  }, [businessId, auth.idToken, getBlocksFromVersion])

  const setPathValue = (object: Record<string, any>, path: string, defaultValue: any) => {
    const segments = path.split('.')
    let cursor = object
    segments.forEach((segment, idx) => {
      if (idx === segments.length - 1) {
        if (cursor[segment] === undefined || cursor[segment] === null || cursor[segment] === '') {
          cursor[segment] = typeof defaultValue === 'function' ? defaultValue() : defaultValue
        }
      } else {
        if (typeof cursor[segment] !== 'object' || cursor[segment] === null) {
          cursor[segment] = {}
        }
        cursor = cursor[segment]
      }
    })
  }

  const requiredSettingsFallback: Record<string, string[]> = {
    hero: ['headline', 'body', 'cta.label', 'cta.url'],
    section: ['heading', 'body'],
    text: ['heading', 'body'],
    cta: ['heading', 'body', 'button', 'link']
  }

  const ensureRequiredSettings = useCallback((type: string, settings: any) => {
    const copy: any = { ...settings }
    const definition = getBlockDefinition(type)
    const required = definition?.requiredSettings?.length
      ? definition.requiredSettings
      : requiredSettingsFallback[type] || []
    required.forEach((key: string) => {
      if (key.includes('.')) {
        setPathValue(copy, key, '')
      } else if (key === 'cta') {
        if (typeof copy.cta !== 'object' || !copy.cta) {
          copy.cta = { label: '', url: '' }
        } else {
          if (copy.cta.label === undefined || copy.cta.label === null) copy.cta.label = ''
          if (copy.cta.url === undefined || copy.cta.url === null) copy.cta.url = ''
        }
      } else if (copy[key] === undefined || copy[key] === null || copy[key] === '') {
        copy[key] = ''
      }
    })
    return copy
  }, [getBlockDefinition])

  const loadBuilderState = useCallback(async (options?: { silent?: boolean }) => {
    if (!businessId || !auth.idToken) {
      setStatus('Select a business to customize.')
      return null
    }
    if (!options?.silent) {
      setStatus('Loading…')
    }
    try {
      const [pageResp, catalogResp, historyResp, usageResp, mediaResp] = await Promise.all([
        api.fetchBusinessPage(businessId, auth.idToken),
        api.fetchBusinessPageCatalog(businessId, auth.idToken),
        api.fetchBusinessPageHistory(businessId, auth.idToken),
        api.fetchBusinessPageUsage(businessId, auth.idToken),
        api.fetchBusinessMedia(businessId, auth.idToken)
      ])
      const draftVersion = pageResp?.draft || pageResp?.Draft || null
      const publishedVersion = pageResp?.published || pageResp?.Published || null
      setDraft(draftVersion)
      setPublished(publishedVersion)
      setDraftBlocks(getBlocksFromVersion(draftVersion))
      if (draftVersion) {
        setTheme(draftVersion.theme || draftVersion.Theme || 'default')
        setPalette(draftVersion.palette ?? draftVersion.Palette ?? null)
      }
      setCatalog(catalogResp || null)
      const historyItems = Array.isArray(historyResp?.items) ? historyResp.items : ensureList(historyResp)
      setHistory(historyItems)
      setUsage(usageResp || null)
      const mediaItems = Array.isArray(mediaResp?.items) ? mediaResp.items : Array.isArray(mediaResp) ? mediaResp : []
      setMedia(mediaItems)
      if (!options?.silent) {
        setStatus('')
      }
      return { draftVersion, publishedVersion }
    } catch (err: any) {
      if (!options?.silent) {
        setStatus(err?.message || 'Unable to load business page builder.')
      }
      return null
    }
  }, [businessId, auth.idToken])

  useEffect(() => {
    loadBuilderState()
  }, [loadBuilderState])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isDesktopViewport = viewportWidth >= 1024
  const normalizeHex = (value: string) => {
    if (!value) return '#000000'
    let hex = value.trim()
    if (hex.startsWith('#')) hex = hex.slice(1)
    hex = hex.replace(/[^0-9a-f]/gi, '')
    if (!hex.length) return '#000000'
    if (hex.length === 3) {
      hex = hex.split('').map(ch => ch + ch).join('')
    }
    if (hex.length < 6) {
      hex = hex.padEnd(6, hex[hex.length - 1] || '0')
    }
    return `#${hex.slice(0, 6)}`
  }

  const openPaletteModal = () => {
    const paletteValue = palette || '#ff5f6d:#ffc371'
    const [primary, secondary] = paletteValue.split(':')
    setPaletteEditorColors({
      primary: normalizeHex(primary || '#ff5f6d'),
      secondary: normalizeHex(secondary || primary || '#ffc371')
    })
    setPaletteModalOpen(true)
  }

  const closePaletteModal = () => setPaletteModalOpen(false)

  const applyPaletteFromEditor = () => {
    setPalette(`${normalizeHex(paletteEditorColors.primary)}:${normalizeHex(paletteEditorColors.secondary)}`)
    closePaletteModal()
  }

  const parsePalette = useCallback((value: string | null | undefined) => {
    const fallback = ['#ff5f6d', '#ffc371']
    if (!value) return fallback
    const parts = value.split(':').map(normalizeHex).filter(Boolean)
    if (!parts.length) return fallback
    if (parts.length === 1) return [parts[0], parts[0]]
    return [parts[0], parts[1]]
  }, [])

  const paletteGradient = useMemo(() => {
    const [primary, secondary] = parsePalette(palette)
    return `linear-gradient(135deg, ${primary}, ${secondary})`
  }, [palette, parsePalette])

  const getRevision = (value: any) => value?.revision ?? value?.Revision ?? null

  const defaultSettingsForType = useCallback((type: string) => {
    switch (type) {
      case 'hero':
        return {
          headline: 'Welcome to our business',
          body: 'Share what makes your experiences unique.',
          cta: { label: 'Follow', url: '#' },
          backgroundMediaId: null
        }
      case 'section':
        return {
          heading: 'Section heading',
          body: 'Add supporting copy for this section.'
        }
      case 'text':
        return { heading: 'Headline', body: 'Add your story or update here.' }
      case 'image':
        return { mediaId: media[0]?.id || media[0]?.mediaId || null, alt: 'Business image' }
      case 'gallery':
        return { mediaIds: media.slice(0, 4).map(m => m.id || m.mediaId).filter(Boolean) }
      case 'cta':
        return { heading: 'Call to action', body: 'Promote ticket drops or merch', button: 'Explore', link: '#' }
      case 'faq':
        return { items: [{ q: 'What do you host?', a: 'Update this answer' }] }
      default:
        return {}
    }
  }, [media])

  const addBlock = (type: string) => {
    const block = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      type,
      order: ensureList(draftBlocks).length,
      settings: defaultSettingsForType(type),
      children: []
    }
    setDraftBlocks(prev => [...ensureList(prev), block])
  }

  const normalizeBlockSettings = (block: any) => {
    const settings = block?.settings || {}
    if (block.type === 'hero') {
      const ctaObject = typeof settings.cta === 'object' && settings.cta !== null
        ? settings.cta
        : {
            label: settings.ctaLabel || settings.cta || '',
            url: settings.ctaUrl || settings.link || ''
          }
      return ensureRequiredSettings(block.type, {
        headline: settings.headline || settings.heading || 'Update your headline',
        body: settings.body || settings.subheading || '',
        cta: {
          label: ctaObject.label || '',
          url: ctaObject.url || ''
        },
        backgroundMediaId: settings.backgroundMediaId || settings.mediaId || null
      })
    }
    if (block.type === 'text') {
      return ensureRequiredSettings(block.type, {
        heading: settings.heading || '',
        body: settings.body || settings.text || ''
      })
    }
    if (block.type === 'section') {
      return ensureRequiredSettings(block.type, {
        heading: settings.heading || '',
        body: settings.body || ''
      })
    }
    return ensureRequiredSettings(block.type, settings)
  }

  const updateBlockSettings = (blockId: string, settings: any) => {
    setDraftBlocks(prev => ensureList(prev).map(block => block.id === blockId ? { ...block, settings } : block))
  }

  const removeBlock = (blockId: string) => {
    setDraftBlocks(prev => ensureList(prev).filter(block => block.id !== blockId))
  }

  const handleDrag = (dragIndex: number, hoverIndex: number) => {
    setDraftBlocks(prev => {
      const clone = [...ensureList(prev)]
      const [removed] = clone.splice(dragIndex, 1)
      clone.splice(hoverIndex, 0, removed)
      return clone
    })
  }

  const normalizeBlock = (block: any, orderIndex: number) => ({
    ...block,
    order: orderIndex,
    settings: normalizeBlockSettings(block),
    children: ensureList(block.children).map((child, childIdx) => normalizeBlock(child, childIdx))
  })

  const buildBlockPayload = () => ensureList(draftBlocks).map((block, idx) => normalizeBlock(block, idx))

  const previewBlocks = useMemo(() => {
    const working = ensureList(draftBlocks)
    if (working.length) return working
    if (draft?.blocks) return ensureList(draft.blocks)
    if (published?.blocks) return ensureList(published.blocks)
    return []
  }, [draftBlocks, draft, published])

  const renderBlockPreview = (block: any) => {
    const commonStyles = {
      border: '1px solid var(--gray-200)',
      borderRadius: '1rem',
      padding: '1.25rem',
      background: 'var(--gray-0)',
      boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)'
    } as React.CSSProperties
    switch (block.type) {
      case 'hero': {
        const settings = block.settings || {}
        return (
          <div key={block.id} style={{ ...commonStyles, textAlign: 'center', background: paletteGradient, color: 'white' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{settings.headline || 'Hero headline'}</h2>
            <p style={{ opacity: 0.8, marginBottom: '1rem' }}>{settings.body || 'Describe your experience.'}</p>
            {settings.cta?.label && (
              <button className="btn btn-primary">
                {settings.cta.label}
              </button>
            )}
          </div>
        )
      }
      case 'section': {
        const settings = block.settings || {}
        return (
          <div key={block.id} style={commonStyles}>
            <h3 style={{ marginBottom: '0.5rem' }}>{settings.heading || 'Section heading'}</h3>
            <p style={{ color: 'var(--gray-600)' }}>{settings.body || 'Add section details'}</p>
            {ensureList(block.children).map(child => (
              <div key={child.id} style={{ marginTop: '1rem' }}>
                {renderBlockPreview(child)}
              </div>
            ))}
          </div>
        )
      }
      case 'text': {
        const settings = block.settings || {}
        return (
          <div key={block.id} style={commonStyles}>
            <h4 style={{ marginBottom: '0.25rem' }}>{settings.heading || 'Text headline'}</h4>
            <p style={{ color: 'var(--gray-600)' }}>{settings.body || 'Add supporting text'}</p>
          </div>
        )
      }
      case 'image': {
        const settings = block.settings || {}
        return (
          <div key={block.id} style={commonStyles}>
            <div style={{ background: 'var(--gray-100)', height: 180, borderRadius: '0.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)' }}>
              {settings.mediaId ? 'Image preview' : 'Add an image'}
            </div>
            <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>{settings.alt || 'Image caption'}</p>
          </div>
        )
      }
      case 'gallery': {
        const settings = block.settings || {}
        const mediaIds = ensureList(settings.mediaIds)
        return (
          <div key={block.id} style={commonStyles}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
              {(mediaIds.length ? mediaIds : [1, 2, 3]).map((_, idx) => (
                <div key={idx} style={{ background: 'var(--gray-100)', borderRadius: '0.5rem', height: 100 }} />
              ))}
            </div>
          </div>
        )
      }
      case 'cta': {
        const settings = block.settings || {}
        return (
          <div key={block.id} style={{ ...commonStyles, textAlign: 'center' }}>
            <h3>{settings.heading || 'Call to action'}</h3>
            <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>{settings.body || 'Prompt users to take action.'}</p>
            <button className="btn btn-primary">{settings.button || 'Learn more'}</button>
          </div>
        )
      }
      case 'faq': {
        const items = ensureList(block.settings?.items).length ? ensureList(block.settings.items) : [{ q: 'Question', a: 'Answer' }]
        return (
          <div key={block.id} style={commonStyles}>
            <h3>FAQ</h3>
            {items.map((item: any, idx: number) => (
              <div key={idx} style={{ marginTop: idx === 0 ? '0.5rem' : '1rem' }}>
                <strong>{item.q || 'Question'}</strong>
                <p style={{ color: 'var(--gray-600)' }}>{item.a || 'Answer details'}</p>
              </div>
            ))}
          </div>
        )
      }
      default:
        return (
          <div key={block.id} style={commonStyles}>
            <code>{block.type}</code>
          </div>
        )
    }
  }

  const persistDraft = async () => {
    if (!businessId || !auth.idToken) return null
    const payload = {
      theme,
      palette,
      expectedRevision: draft?.revision ?? null,
      blocks: buildBlockPayload()
    }
    await api.saveBusinessPage(businessId, payload, auth.idToken)
    const refreshed = await loadBuilderState({ silent: true })
    return refreshed?.draftVersion || null
  }

  const handleSave = async () => {
    if (!businessId || !auth.idToken) return
    setSaveStatus('Saving draft…')
    try {
      await persistDraft()
      setSaveStatus('Draft saved')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Save failed')
    }
  }

  const handlePublish = async () => {
    if (!businessId || !auth.idToken) return
    if (!ensureList(draftBlocks).length) {
      setSaveStatus('Add at least one block before publishing.')
      return
    }
    setSaveStatus('Publishing…')
    try {
      const saved = await persistDraft()
      const revisionForPublish = getRevision(saved) ?? getRevision(draft)
      if (!revisionForPublish) {
        setSaveStatus('Save a draft before publishing.')
        return
      }
      const publishedVersion = await api.publishBusinessPage(businessId, { expectedRevision: revisionForPublish }, auth.idToken)
      if (publishedVersion) {
        setPublished(publishedVersion)
      }
      await loadBuilderState({ silent: true })
      setSaveStatus('Published')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Publish failed')
    }
  }

  const handlePreview = async () => {
    if (!businessId || !auth.idToken) return
    if (!ensureList(draftBlocks).length) {
      setSaveStatus('Add at least one block before previewing.')
      return
    }
    setSaveStatus('Preparing preview…')
    try {
      const saved = await persistDraft()
      const revisionForPreview = getRevision(saved) ?? getRevision(draft)
      if (!revisionForPreview) {
        setSaveStatus('Save your draft before previewing.')
        return
      }
      const resp = await api.requestBusinessPagePreviewToken(businessId, {}, auth.idToken)
      setPreviewToken(resp?.token || resp?.previewToken || null)
      setSaveStatus('Preview link ready')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Preview failed')
    }
  }

  const handleDiscardDraft = async () => {
    if (!businessId || !auth.idToken) return
    setSaveStatus('Discarding draft…')
    try {
      await api.discardBusinessPageDraft(businessId, auth.idToken)
      await loadBuilderState({ silent: true })
      setSaveStatus('Draft discarded')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Discard failed')
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!businessId || !auth.idToken) return
    setSaveStatus('Restoring version…')
    try {
      await api.restoreBusinessPageVersion(businessId, versionId, {}, auth.idToken)
      await loadBuilderState({ silent: true })
      setSaveStatus('Version restored')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Restore failed')
    }
  }

  const handleUploadMedia = async (file?: File) => {
    if (!businessId || !auth.idToken || !file) return
    setMediaStatus('Uploading…')
    try {
      const uploaded = await api.uploadBusinessMedia(businessId, file, auth.idToken)
      setMedia(prev => [uploaded, ...ensureList(prev)])
      setMediaStatus('Uploaded')
    } catch (err: any) {
      setMediaStatus(err?.message || 'Upload failed')
    }
  }

  if (!businessId) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Business Profile</h1>
        <p>Upgrade to a business account to customize your profile page.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/publisher')}>
          Back to Publisher Console
        </button>
      </div>
    )
  }

  if (!isDesktopViewport) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Open on Desktop</h1>
        <p style={{ maxWidth: '520px', margin: '0 auto 1.5rem' }}>
          The Business Page Builder requires more screen space. Please continue on a desktop or large tablet (at least 1024px wide).
        </p>
        <button className="btn btn-secondary" onClick={() => navigate('/publisher')}>
          Back to Publisher Console
        </button>
      </div>
    )
  }

  return (
    <div>
      <SiteNav
        links={[
          { to: '/publisher', label: 'Publisher Console' },
          ...(businessId ? [{ to: `/business/${businessId}`, label: 'View Profile', key: 'view-profile' }] : [])
        ]}
        activePath={`/publisher/business/${businessId || ''}/page`}
      />
      <div className="container" style={{ padding: '2rem 0' }}>
        <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ color: 'var(--gray-500)', margin: 0 }}>Business Profile Builder</p>
            <h1 style={{ margin: 0 }}>Customize your public profile</h1>
            {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => loadBuilderState({ silent: true })}>Refresh</button>
            <button className="btn btn-secondary" onClick={handleDiscardDraft}>Discard Draft</button>
            <button className="btn btn-secondary" onClick={handlePreview}>Preview</button>
            <button className="btn btn-secondary" onClick={handleSave}>Save Draft</button>
            <button className="btn btn-primary" onClick={handlePublish}>Publish</button>
          </div>
        </header>

        {saveStatus && <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>{saveStatus}</p>}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Toolbox</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Add blocks & upload media</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {blockPalette.map(block => (
                <button
                  key={block.type}
                  className="btn btn-secondary"
                  onClick={() => addBlock(block.type)}
                  title={block.description || block.label}
                >
                  {block.icon} {block.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 240px' }}>
                <input type="file" onChange={(e) => handleUploadMedia(e.target.files?.[0])} />
              </div>
              {mediaStatus && <p style={{ color: 'var(--gray-600)', margin: 0 }}>{mediaStatus}</p>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {media.slice(0, 6).map(item => (
                <span key={item.id || item.mediaId} style={{ fontSize: '0.85rem', color: 'var(--gray-500)', border: '1px solid var(--gray-200)', borderRadius: '999px', padding: '0.25rem 0.75rem' }}>
                  {item.filename || item.fileName || item.id}
                </span>
              ))}
              {!media.length && <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>No media uploaded yet.</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'minmax(360px, 480px) 1fr', alignItems: 'start' }}>
          <div className="card">
            <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <label className="form-label">Theme</label>
                    <select className="form-input" value={theme} onChange={(e) => setTheme(e.target.value)}>
                      <option value="default">Default</option>
                      <option value="dark">Dark</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Palette</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input className="form-input" value={palette || ''} onChange={(e) => setPalette(e.target.value || null)} placeholder="Optional hex/campaign palette" />
                      <button type="button" className="btn btn-secondary" onClick={openPaletteModal}>Palette builder</button>
                    </div>
                  </div>
                </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {ensureList(draftBlocks).map((block, index) => (
                  <div key={block.id} className="card" style={{ border: '1px solid var(--gray-200)', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{block.type.toUpperCase()}</strong>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {index > 0 && (
                          <button className="btn btn-secondary" type="button" onClick={() => handleDrag(index, index - 1)}>↑</button>
                        )}
                        {index < ensureList(draftBlocks).length - 1 && (
                          <button className="btn btn-secondary" type="button" onClick={() => handleDrag(index, index + 1)}>↓</button>
                        )}
                        <button className="btn btn-secondary" type="button" onClick={() => removeBlock(block.id)}>Remove</button>
                      </div>
                    </div>
                    <textarea
                      className="form-input"
                      rows={4}
                      value={JSON.stringify(block.settings, null, 2)}
                      onChange={(e) => {
                        try {
                          updateBlockSettings(block.id, JSON.parse(e.target.value))
                        } catch {
                          // ignore invalid JSON
                        }
                      }}
                    />
                  </div>
                ))}
                {!ensureList(draftBlocks).length && (
                  <p style={{ color: 'var(--gray-600)' }}>Add blocks to start building your business profile.</p>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div className="card">
              <div className="card-body">
                <h3 className="card-title">Live Preview</h3>
                <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>Updates as you edit blocks. Shows your saved draft when no unsaved changes are present.</p>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {previewBlocks.length ? (
                    previewBlocks.map(block => renderBlockPreview(block))
                  ) : (
                    <p style={{ color: 'var(--gray-500)' }}>Add blocks to see a preview.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h3 className="card-title">History</h3>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {ensureList(history).map((item) => (
                    <div key={item.id || item.versionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{item.theme || 'Theme update'}</strong>
                        <p style={{ margin: 0, color: 'var(--gray-600)' }}>{item.createdAt || item.publishedAt}</p>
                      </div>
                      <button className="btn btn-secondary" onClick={() => handleRestoreVersion(item.id || item.versionId)}>
                        Restore
                      </button>
                    </div>
                  ))}
                  {!ensureList(history).length && <p style={{ color: 'var(--gray-600)' }}>No history yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {paletteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20
          }}
          onClick={closePaletteModal}
        >
          <div className="card" style={{ width: 'min(480px, 90%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title" style={{ margin: 0 }}>Palette Builder</h3>
                <button className="btn btn-secondary" onClick={closePaletteModal}>×</button>
              </div>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Primary</label>
                    <input
                      type="color"
                      value={paletteEditorColors.primary}
                      onChange={(e) => setPaletteEditorColors(prev => ({ ...prev, primary: e.target.value }))}
                    />
                  </div>
                  <input
                    className="form-input"
                    value={paletteEditorColors.primary}
                    onChange={(e) => setPaletteEditorColors(prev => ({ ...prev, primary: normalizeHex(e.target.value) }))}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Secondary</label>
                    <input
                      type="color"
                      value={paletteEditorColors.secondary}
                      onChange={(e) => setPaletteEditorColors(prev => ({ ...prev, secondary: e.target.value }))}
                    />
                  </div>
                  <input
                    className="form-input"
                    value={paletteEditorColors.secondary}
                    onChange={(e) => setPaletteEditorColors(prev => ({ ...prev, secondary: normalizeHex(e.target.value) }))}
                  />
                </div>
                <div style={{ borderRadius: '1rem', padding: '1rem', background: `linear-gradient(135deg, ${paletteEditorColors.primary}, ${paletteEditorColors.secondary})`, color: 'white' }}>
                  <strong>Preview</strong>
                  <p style={{ margin: 0 }}>This gradient will be used for highlight areas.</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={closePaletteModal}>Cancel</button>
                  <button className="btn btn-primary" onClick={applyPaletteFromEditor}>Apply</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewToken && (
        <div className="container" style={{ marginBottom: '1rem' }}>
          <div className="card">
            <div className="card-body">
              <p style={{ margin: 0 }}>
                Preview link:{' '}
                <a href={`/business/${businessId}?previewToken=${previewToken}`} target="_blank" rel="noopener noreferrer">
                  Open preview
                </a>
              </p>
              <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={async () => {
                if (businessId && auth.idToken && previewToken) {
                  try {
                    await api.revokeBusinessPagePreviewToken(businessId, previewToken, auth.idToken)
                    setPreviewToken(null)
                    setSaveStatus('Preview revoked.')
                  } catch (err: any) {
                    setSaveStatus(err?.message || 'Unable to revoke preview.')
                  }
                }
              }}>Revoke preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
