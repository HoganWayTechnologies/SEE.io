import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

type ScanResult = {
  token: string
  ok: boolean
  message: string
  at: string
  attendee?: string | null
}

export default function HostScanPage() {
  const { eventId: eventIdParam } = useParams()
  const auth = useAuth()
  const [eventId, setEventId] = useState(eventIdParam || '')
  const [venueId, setVenueId] = useState(auth.primaryBusinessId || '')
  const [scanStatus, setScanStatus] = useState<string | null>('Ready to scan')
  const [history, setHistory] = useState<ScanResult[]>([])
  const [manualToken, setManualToken] = useState('')
  const lastTokenRef = useRef<string | null>(null)
  const scannerRef = useRef<any>(null)
  const deviceIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}`
  )

  const extractToken = (raw: string) => {
    if (!raw) return ''
    try {
      const parsed = new URL(raw)
      return parsed.searchParams.get('t') || parsed.searchParams.get('token') || raw
    } catch {
      return raw
    }
  }

  const addHistory = (entry: ScanResult) => {
    setHistory(prev => [entry, ...prev].slice(0, 10))
  }

  const validateToken = async (raw: string) => {
    const token = extractToken(raw)
    if (!token) {
      setScanStatus('No token detected.')
      return
    }
    if (!auth.idToken) {
      setScanStatus('Sign in to validate tickets.')
      return
    }
    if (lastTokenRef.current === token) {
      setScanStatus('Already scanned. Ready for next.')
      return
    }
    lastTokenRef.current = token
    try {
      setScanStatus('Validating…')
      const resp = await api.validateTicketToken({
        token,
        eventId: eventId || null,
        venueId: venueId || null,
        deviceId: deviceIdRef.current
      }, auth.idToken)
      const attendee = resp?.attendeeName || resp?.ticketHolder || null
      setScanStatus('✅ Valid ticket')
      addHistory({ token, ok: true, message: resp?.message || 'Valid', at: new Date().toLocaleTimeString(), attendee })
    } catch (err: any) {
      setScanStatus(`❌ ${err?.message || 'Invalid ticket'}`)
      addHistory({ token, ok: false, message: err?.message || 'Invalid ticket', at: new Date().toLocaleTimeString() })
    }
  }

  useEffect(() => {
    let isMounted = true
    const startScanner = async () => {
      try {
        const mod = await import('html5-qrcode')
        if (!isMounted) return
        const Html5QrcodeScanner = (mod as any).Html5QrcodeScanner
        const instance = new Html5QrcodeScanner('qr-reader', { fps: 8, qrbox: { width: 250, height: 250 } }, false)
        instance.render(
          (decodedText: string) => {
            validateToken(decodedText)
          },
          () => {}
        )
        scannerRef.current = instance
      } catch (err) {
        console.warn('scanner init failed', err)
        setScanStatus('Camera unavailable. Enter codes manually.')
      }
    }
    startScanner()
    return () => {
      isMounted = false
      if (scannerRef.current?.clear) {
        scannerRef.current.clear().catch(() => scannerRef.current?.stop?.())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualToken.trim()) return
    validateToken(manualToken.trim())
    setManualToken('')
  }

  return (
    <div>
      <SiteNav activePath="/host/scan" />
      <div className="container" style={{ padding: '2rem 0 3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>Door</p>
            <h1 style={{ margin: 0 }}>Scan tickets</h1>
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>Use your camera or paste a code. Works best on mobile.</p>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-body" style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', minWidth: 220 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Event ID</label>
              <input className="form-input" value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="Event ID (optional)" />
              <label className="form-label" style={{ marginBottom: 0 }}>Venue ID</label>
              <input className="form-input" value={venueId} onChange={(e) => setVenueId(e.target.value)} placeholder="Venue ID (optional)" />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card-body" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
            <div>
              <div id="qr-reader" style={{ width: '100%' }} />
              <p style={{ color: scanStatus?.startsWith('✅') ? 'green' : 'var(--gray-700)', marginTop: '0.5rem' }}>
                {scanStatus}
              </p>
            </div>
            <div>
              <form onSubmit={handleManualSubmit} style={{ display: 'grid', gap: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Manual token</label>
                <input className="form-input" value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="Paste token or QR content" />
                <button className="btn btn-primary" type="submit">Validate</button>
              </form>
              <div style={{ marginTop: '1rem' }}>
                <p className="card-title" style={{ marginTop: 0 }}>Recent scans</p>
                {history.length === 0 && <p style={{ color: 'var(--gray-600)', margin: 0 }}>No scans yet.</p>}
                <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {history.map((item, idx) => (
                    <div key={`${item.token}-${idx}`} className="card" style={{ margin: 0 }}>
                      <div className="card-body">
                        <p style={{ margin: 0, fontWeight: 600 }}>{item.ok ? '✅ Valid' : '❌ Invalid'} · {item.at}</p>
                        <p style={{ margin: '0.25rem 0', color: 'var(--gray-700)' }}>{item.message}</p>
                        <p style={{ margin: 0, color: 'var(--gray-600)', wordBreak: 'break-all' }}>{item.token}</p>
                        {item.attendee && <p style={{ margin: '0.25rem 0 0 0', color: 'var(--gray-600)' }}>Name: {item.attendee}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
