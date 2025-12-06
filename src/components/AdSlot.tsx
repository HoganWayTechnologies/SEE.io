import React, { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    adsbygoogle?: any[]
  }
}

type AdSlotProps = {
  variant?: 'banner' | 'rail'
  placementId: string
  label?: string
  format?: string
}

const variantStyles: Record<'banner' | 'rail', React.CSSProperties> = {
  banner: {
    width: '100%',
    minHeight: '90px',
    borderRadius: '0.75rem'
  },
  rail: {
    minWidth: '180px',
    minHeight: '320px',
    borderRadius: '0.75rem'
  }
}

const placeholderStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(14,116,144,0.08), rgba(8,47,73,0.12))',
  border: '1px dashed rgba(15,118,110,0.5)',
  color: 'var(--gray-700)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  padding: '1rem',
  fontSize: '0.9rem',
  fontWeight: 500
}

const AD_CLIENT =
  (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) ||
  (import.meta.env.VITE_ADMOB_AD_CLIENT as string | undefined) ||
  ''

const loadAdScript = () => {
  if (!AD_CLIENT) return
  if (document.querySelector(`script[data-see-ad-client="${AD_CLIENT}"]`)) return
  const script = document.createElement('script')
  script.setAttribute('data-see-ad-client', AD_CLIENT)
  script.async = true
  script.crossOrigin = 'anonymous'
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`
  document.head.appendChild(script)
}

export default function AdSlot({ variant = 'banner', placementId, label, format }: AdSlotProps) {
  const insRef = useRef<HTMLModElement | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadAdScript()
  }, [])

  useEffect(() => {
    if (!AD_CLIENT || !insRef.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      setReady(true)
    } catch (err) {
      console.warn('ad slot render failed', err)
      setReady(false)
    }
  }, [placementId])

  if (!AD_CLIENT) {
    return (
      <div className={`ad-slot ad-slot-${variant}`} style={{ ...variantStyles[variant], ...placeholderStyle }}>
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)' }}>
            Sponsored
          </div>
          <div>{label || 'Ad placement'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.35rem' }}>
            Set VITE_ADMOB_AD_CLIENT to serve live ads.
          </div>
        </div>
      </div>
    )
  }

  return (
    <ins
      ref={insRef as any}
      className="adsbygoogle"
      style={{ display: 'block', width: '100%', minHeight: variant === 'banner' ? '90px' : '320px' }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={placementId}
      data-ad-format={format || (variant === 'banner' ? 'horizontal' : 'rectangle')}
      data-full-width-responsive="true"
    >
      {!ready && (
        <div style={placeholderStyle}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)' }}>
              Sponsored
            </div>
            <div>{label || `Ad placement (${variant})`}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.35rem' }}>
              Set VITE_ADSENSE_CLIENT to serve live ads.
            </div>
          </div>
        </div>
      )}
    </ins>
  )
}
