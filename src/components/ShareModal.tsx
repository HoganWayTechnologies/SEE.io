import React, { useMemo, useState } from 'react'

type ShareChannel = {
  id: string
  label: string
  utm: { source: string; medium: string; campaign?: string }
}

const channels: ShareChannel[] = [
  { id: 'ig-story', label: 'Instagram story', utm: { source: 'instagram', medium: 'story', campaign: 'see_event' } },
  { id: 'ig-bio', label: 'Instagram bio', utm: { source: 'instagram', medium: 'bio', campaign: 'see_event' } },
  { id: 'facebook', label: 'Facebook', utm: { source: 'facebook', medium: 'social', campaign: 'see_event' } },
  { id: 'x', label: 'X / Twitter', utm: { source: 'x', medium: 'social', campaign: 'see_event' } },
  { id: 'email', label: 'Email', utm: { source: 'email', medium: 'newsletter', campaign: 'see_event' } }
]

const buildUtmUrl = (baseUrl: string, utm: ShareChannel['utm']) => {
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('utm_source', utm.source)
    url.searchParams.set('utm_medium', utm.medium)
    if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign)
    return url.toString()
  } catch {
    return baseUrl
  }
}

export default function ShareModal({
  open,
  baseUrl,
  onClose,
  onShare
}: {
  open: boolean
  baseUrl: string | null
  onClose: () => void
  onShare?: (channelId: string, url: string) => void
}) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const shareLinks = useMemo(() => {
    if (!baseUrl) return []
    return channels.map(channel => ({
      ...channel,
      url: buildUtmUrl(baseUrl, channel.utm)
    }))
  }, [baseUrl])

  const handleCopy = async () => {
    if (!baseUrl) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(baseUrl)
      } else if (typeof document !== 'undefined') {
        const input = document.createElement('input')
        input.value = baseUrl
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopyStatus('Copied!')
      window.setTimeout(() => setCopyStatus(null), 1500)
    } catch {
      setCopyStatus('Copy failed')
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>Share your event</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close share modal">×</button>
        </div>
        {!baseUrl && <p style={{ color: 'var(--gray-600)' }}>Unable to generate a share link.</p>}
        {baseUrl && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="form-label">Share link</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input className="form-input" value={baseUrl} readOnly />
                <button type="button" className="btn btn-secondary" onClick={handleCopy}>
                  Copy
                </button>
              </div>
              {copyStatus && <div style={{ color: 'var(--gray-600)', marginTop: '0.35rem' }}>{copyStatus}</div>}
            </div>
            <div>
              <label className="form-label">Channel shortcuts</label>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {shareLinks.map(channel => (
                  <button
                    key={channel.id}
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      onShare?.(channel.id, channel.url)
                      window.open(channel.url, '_blank', 'noopener,noreferrer')
                    }}
                    style={{ textAlign: 'left' }}
                  >
                    {channel.label}
                  </button>
                ))}
              </div>
            </div>
            <a href={baseUrl} target="_blank" rel="noopener noreferrer" className="nav-link">
              Test your public page
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
