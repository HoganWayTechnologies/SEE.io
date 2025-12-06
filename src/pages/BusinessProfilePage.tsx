import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import Footer from '../components/Footer'
import { api } from '../services/api'

const ensureList = (value: any): any[] => (Array.isArray(value) ? value : [])

const normalizeBlock = (block: any): any => {
  if (!block) return null
  return {
    id: block.id || block.Id || crypto.randomUUID(),
    type: (block.type || block.Type || 'text').toString().toLowerCase(),
    order: block.order ?? block.Order ?? 0,
    settings: block.settings || block.Settings || {},
    children: ensureList(block.children || block.Children).map(normalizeBlock).filter(Boolean)
  }
}

const getBlocksFromVersion = (version: any): any[] => {
  const source = ensureList(version?.blocks || version?.Blocks || [])
  return source.map(normalizeBlock).filter(Boolean)
}

const parsePalette = (value: string | null | undefined): [string, string] => {
  const normalize = (input?: string) => {
    if (!input) return '#1e1b4b'
    let hex = input.trim()
    if (hex.startsWith('#')) hex = hex.slice(1)
    hex = hex.replace(/[^0-9a-f]/gi, '')
    if (!hex) return '#1e1b4b'
    if (hex.length === 3) hex = hex.split('').map(ch => `${ch}${ch}`).join('')
    if (hex.length < 6) hex = hex.padEnd(6, hex[hex.length - 1])
    return `#${hex.slice(0, 6)}`
  }
  if (!value) return ['#1e1b4b', '#312e81']
  const [primary, secondary] = value.split(':')
  return [normalize(primary), normalize(secondary || primary)]
}

export default function BusinessProfilePage() {
  const { businessId } = useParams()
  const [searchParams] = useSearchParams()
  const [pageVersion, setPageVersion] = useState<any | null>(null)
  const [blocks, setBlocks] = useState<any[]>([])
  const [palette, setPalette] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>('Loading profile…')
  const previewToken = searchParams.get('previewToken')

  useEffect(() => {
    const load = async () => {
      if (!businessId) {
        setStatus('Profile not found.')
        return
      }
      try {
        const query = previewToken ? `?previewToken=${encodeURIComponent(previewToken)}` : ''
        const resp = await api.fetchBusinessProfilePage(businessId, query)
        const version =
          resp?.page ||
          resp?.Page ||
          resp?.published ||
          resp?.Published ||
          resp
        if (version) {
          setPageVersion(version)
          setBlocks(getBlocksFromVersion(version))
          setPalette(version.palette ?? version.Palette ?? null)
          setStatus(null)
        } else {
          setPageVersion(null)
          setBlocks([])
          setPalette(null)
          setStatus('No published profile yet.')
        }
      } catch (err: any) {
        setStatus(err?.message || 'Unable to load business profile.')
      }
    }
    load()
  }, [businessId, previewToken])

  const paletteGradient = useMemo(() => {
    const [primary, secondary] = parsePalette(palette)
    return `linear-gradient(135deg, ${primary}, ${secondary})`
  }, [palette])

  const renderBlock = (block: any) => {
    const settings = block?.settings || {}
    switch (block.type) {
      case 'hero':
        return (
          <section key={block.id} className="card" style={{ marginBottom: '1rem', textAlign: 'center', background: paletteGradient, color: 'white' }}>
            <div className="card-body">
              <h2 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>{settings.headline || settings.heading || 'Hero heading'}</h2>
              {(settings.body || settings.subheading) && <p style={{ color: 'rgba(255,255,255,0.9)' }}>{settings.body || settings.subheading}</p>}
              {settings.cta?.url && settings.cta?.label && (
                <a href={settings.cta.url} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                  {settings.cta.label}
                </a>
              )}
            </div>
          </section>
        )
      case 'section':
        return (
          <section key={block.id} style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>{settings.heading || 'Section heading'}</h3>
            {settings.body && <p style={{ color: 'var(--gray-600)' }}>{settings.body}</p>}
            <div style={{ display: 'grid', gap: '1rem' }}>
              {ensureList(block.children).map(child => renderBlock(child))}
            </div>
          </section>
        )
      case 'text':
        return (
          <section key={block.id} className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              {settings.heading && <h4 style={{ marginBottom: '0.25rem' }}>{settings.heading}</h4>}
              <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{settings.body || settings.text || 'Add some descriptive text.'}</p>
            </div>
          </section>
        )
      case 'image': {
        const imageUrl = settings.mediaUrl || settings.url || settings.src
        return (
          <section key={block.id} className="card" style={{ marginBottom: '1rem', textAlign: 'center' }}>
            {imageUrl ? (
              <img src={imageUrl} alt={settings.alt || 'Image'} style={{ maxWidth: '100%', borderRadius: '0.5rem' }} />
            ) : (
              <div style={{ padding: '2rem', color: 'var(--gray-500)' }}>Image placeholder</div>
            )}
          </section>
        )
      }
      case 'gallery': {
        const items = ensureList(settings.media || settings.items || [])
        return (
          <section key={block.id} className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
              {items.length ? (
                items.map((item: any, idx: number) => (
                  <img key={idx} src={item.url || item.src} alt={item.alt || 'Gallery'} style={{ width: '100%', borderRadius: '0.5rem' }} />
                ))
              ) : (
                <p style={{ color: 'var(--gray-500)' }}>Gallery items coming soon.</p>
              )}
            </div>
          </section>
        )
      }
      case 'cta':
        return (
          <section key={block.id} className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body" style={{ textAlign: 'center' }}>
              <h3>{settings.heading || 'Call to action'}</h3>
              {settings.body && <p style={{ color: 'var(--gray-600)' }}>{settings.body}</p>}
              {settings.button && settings.link && (
                <a className="btn btn-primary" href={settings.link} target="_blank" rel="noopener noreferrer">
                  {settings.button}
                </a>
              )}
            </div>
          </section>
        )
      case 'faq':
        return (
          <section key={block.id} className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <h3 className="card-title">FAQ</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {ensureList(settings.items).map((item: any, idx: number) => (
                  <div key={idx}>
                    <strong>{item.q}</strong>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-600)' }}>{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      default:
        return (
          <section key={block.id} className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <pre style={{ margin: 0 }}>{JSON.stringify(block.settings, null, 2)}</pre>
            </div>
          </section>
        )
    }
  }

  return (
    <div>
      <SiteNav />
      <div className="container" style={{ padding: '2rem 0', minHeight: '70vh' }}>
        {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
        {pageVersion && (
          <>
            {pageVersion.banner && (
              <div style={{ marginBottom: '1rem' }}>
                <img src={pageVersion.banner} alt={pageVersion.name || 'Business banner'} style={{ width: '100%', borderRadius: '0.75rem', maxHeight: '320px', objectFit: 'cover' }} />
              </div>
            )}
            <header style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{pageVersion.name || 'Business Profile'}</h1>
              {pageVersion.tagline && <p style={{ color: 'var(--gray-600)', fontSize: '1.1rem' }}>{pageVersion.tagline}</p>}
            </header>
            {blocks.map(renderBlock)}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
