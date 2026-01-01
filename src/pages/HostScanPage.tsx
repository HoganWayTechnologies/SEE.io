import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import { api, seeApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

type ScanPhase = 'idle' | 'pending' | 'success' | 'error'

type ScanStatus = {
  phase: ScanPhase
  label: string
  detail?: string | null
  attendee?: string | null
  ticketId?: string | null
  reason?: string | null
}

type HistoryEntry = {
  id: string
  token: string
  phase: Extract<ScanPhase, 'success' | 'error'>
  label: string
  detail?: string | null
  attendee?: string | null
  at: string
}

type EventOption = {
  id: string
  title: string
  subtitle?: string | null
  venueId?: string | null
}

const statusThemes: Record<ScanPhase, { background: string; color: string; borderColor: string }> = {
  idle: { background: 'var(--gray-100)', color: 'var(--gray-800)', borderColor: 'var(--gray-300)' },
  pending: { background: 'var(--indigo-50, #eef2ff)', color: 'var(--indigo-800, #3730a3)', borderColor: 'var(--indigo-200, #c7d2fe)' },
  success: { background: 'var(--green-50, #ecfdf5)', color: 'var(--green-800, #065f46)', borderColor: 'var(--green-200, #a7f3d0)' },
  error: { background: 'var(--rose-50, #fff1f2)', color: 'var(--rose-800, #9f1239)', borderColor: 'var(--rose-200, #fecdd3)' }
}

const reasonCopy: Record<string, string> = {
  not_found: 'Ticket not found.',
  wrong_event: 'Ticket belongs to another event.',
  wrong_venue: 'Ticket belongs to another venue.',
  outside_window: 'Check-in window closed.',
  already_used: 'Ticket already used.',
  unauthorized: 'You are not authorized to scan this ticket.',
  forbidden: 'You are not authorized to scan this ticket.'
}

const buildHistoryEntry = (token: string, status: ScanStatus): HistoryEntry => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  token,
  phase: status.phase === 'success' ? 'success' : 'error',
  label: status.label,
  detail: status.detail,
  attendee: status.attendee || undefined,
  at: new Date().toLocaleTimeString()
})

const sanitizeToken = (raw: string) => {
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    const paramToken = parsed.searchParams.get('t') || parsed.searchParams.get('token')
    if (paramToken) return paramToken
    const pathToken = parsed.pathname.split('/').filter(Boolean).pop()
    return pathToken || raw
  } catch {
    return raw
  }
}

const formatEventDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export default function HostScanPage() {
  const { eventId: eventIdParam } = useParams<{ eventId?: string }>()
  const auth = useAuth()
  const [eventId, setEventId] = useState(eventIdParam || '')
  const [venueId, setVenueId] = useState(auth?.primaryBusinessId || '')
  const [events, setEvents] = useState<EventOption[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [status, setStatus] = useState<ScanStatus>({ phase: 'idle', label: 'Ready to scan' })
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [manualToken, setManualToken] = useState('')
  const [eventDetails, setEventDetails] = useState<{ title: string; venueName?: string | null } | null>(null)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const lastScanRef = useRef<{ token: string; ts: number } | null>(null)
  const scannerRef = useRef<any>(null)
  const clearDuplicateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deviceIdRef = useRef<string>(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `device-${Date.now()}`
  )

  const themedStyle = useMemo(() => {
    return statusThemes[status.phase]
  }, [status.phase])

  const activeEvent = useMemo(() => events.find(item => item.id === eventId) || null, [events, eventId])

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

  useEffect(() => {
    if (venueId || !auth?.primaryBusinessId) return
    setVenueId(auth.primaryBusinessId)
  }, [auth?.primaryBusinessId, venueId])

  const friendlyErrorLabel = (reason?: string | null, fallback?: string) => {
    const normalized = reason ? reason.toLowerCase() : undefined
    if (normalized && reasonCopy[normalized]) return reasonCopy[normalized]
    return fallback || 'Ticket invalid.'
  }

  const pushHistory = (entry: HistoryEntry) => {
    setHistory(prev => [entry, ...prev].slice(0, 12))
  }

  const setPending = () => setStatus({ phase: 'pending', label: 'Validating…' })

  const setValidStatus = (token: string, payload: any) => {
    const attendee =
      payload?.attendeeName || payload?.ticketHolder || payload?.buyerName || payload?.customer || null
    const detailParts: string[] = []
    if (payload?.ticketId) detailParts.push(`Ticket #${payload.ticketId}`)
    if (payload?.status) detailParts.push(`Status: ${String(payload.status).replace(/_/g, ' ')}`)
    if (payload?.seat) detailParts.push(`Seat: ${payload.seat}`)
    if (payload?.message) detailParts.push(payload.message)
    const detail = detailParts.length ? detailParts.join(' · ') : null
    const nextStatus: ScanStatus = {
      phase: 'success',
      label: 'Ticket accepted',
      detail,
      attendee,
      ticketId: payload?.ticketId || null
    }
    setStatus(nextStatus)
    pushHistory(buildHistoryEntry(token, nextStatus))
  }

  const setInvalidStatus = (token: string, reason: string | null, message?: string | null) => {
    const label = friendlyErrorLabel(reason || undefined, message || undefined)
    const nextStatus: ScanStatus = {
      phase: 'error',
      label,
      detail: message && message !== label ? message : null,
      reason
    }
    setStatus(nextStatus)
    if (token) {
      pushHistory(buildHistoryEntry(token, nextStatus))
    }
  }

  const validateToken = async (rawToken: string) => {
    const token = sanitizeToken(rawToken.trim())
    if (!token) {
      setInvalidStatus('', null, 'No ticket data detected.')
      return
    }
    if (!auth.idToken) {
      setInvalidStatus(token, 'unauthorized', 'Sign in with a host account to scan tickets.')
      return
    }
    if (!eventId && !businessId) {
      setInvalidStatus(token, null, 'Choose an event before validating tickets.')
      return
    }

    const now = Date.now()
    if (lastScanRef.current && lastScanRef.current.token === token && now - lastScanRef.current.ts < 1500) {
      setStatus(prev => ({ ...prev, label: 'Duplicate scan ignored', phase: prev.phase }))
      return
    }
    lastScanRef.current = { token, ts: now }
    if (clearDuplicateTimer.current) clearTimeout(clearDuplicateTimer.current)
    clearDuplicateTimer.current = setTimeout(() => {
      lastScanRef.current = null
    }, 2000)

    try {
      setPending()
      const payload = {
        token,
        eventId: eventId || undefined,
        venueId: venueId || undefined,
        businessId: businessId || undefined,
        deviceId: deviceIdRef.current
      }
      const resp = await api.validateTicketToken(payload, auth.idToken)
      if (resp?.valid === false) {
        setInvalidStatus(token, resp?.reason || null, resp?.message || null)
        return
      }
      setValidStatus(token, resp || {})
    } catch (err: any) {
      setInvalidStatus(token, err?.reason || null, err?.message || null)
    }
  }

  useEffect(() => {
    if (!auth.idToken) return
    if (!businessId) {
      setEvents([])
      setEventsError('Select a business to fetch events for scanning.')
      setEventsLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        setEventsLoading(true)
        setEventsError(null)
        const resp = await api.fetchPublisherEventsAuthorized(auth.idToken, {
          businessId,
          pageSize: 100,
          status: 'published'
        })
        if (cancelled) return
        const items = Array.isArray(resp?.items) ? resp.items : Array.isArray(resp) ? resp : []
        const mapped: EventOption[] = items.map((item: any) => ({
          id: (item?.id || item?.eventId || item?.Id || '').toString(),
          title: item?.title || item?.name || 'Event',
          subtitle: item?.startUtc || item?.StartUtc || item?.startDate || null,
          venueId: item?.venueId || item?.VenueId || item?.venue?.id || null
        }))
        setEvents(mapped)
        if (mapped.length) {
          const existingInList = mapped.some(item => item.id === eventId)
          if (!eventId || !existingInList) {
            setEventId(mapped[0].id)
          }
        }
      } catch (err) {
        console.warn('Failed to load host events for scanner', err)
        setEventsError('Unable to load your events right now.')
      } finally {
        if (!cancelled) setEventsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.idToken, businessId])

  useEffect(() => {
    if (!eventId) {
      setEventDetails(null)
      return
    }
    let cancelled = false
    const loadEventDetails = async () => {
      try {
        const data = await seeApi.getEvent(eventId)
        if (cancelled) return
        const title = data?.title || data?.name || 'Event'
        const venueName = data?.venue?.name || data?.venueName || null
        setEventDetails({ title, venueName })
        const detectedVenueId =
          data?.venue?.id || data?.venueId || data?.VenueId || data?.venue?.venueId || null
        if (detectedVenueId) {
          setVenueId(detectedVenueId.toString())
        } else if (activeEvent?.venueId) {
          setVenueId(activeEvent.venueId)
        }
      } catch (err) {
        console.warn('Failed to load event details for scanner', err)
      }
    }
    loadEventDetails()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, activeEvent?.venueId])

  useEffect(() => {
    if (activeEvent?.venueId) {
      setVenueId(activeEvent.venueId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEvent?.venueId])

  useEffect(() => {
    let isMounted = true
    const startScanner = async () => {
      try {
        const mod = await import('html5-qrcode')
        if (!isMounted) return
        const Html5QrcodeScanner = (mod as any).Html5QrcodeScanner
        const instance = new Html5QrcodeScanner(
          'qr-reader',
          { fps: 8, qrbox: { width: 260, height: 260 }, rememberLastUsedCamera: true },
          false
        )
        instance.render((decodedText: string) => validateToken(decodedText), () => {})
        scannerRef.current = instance
      } catch (err) {
        console.warn('Scanner initialization failed', err)
        setStatus({ phase: 'error', label: 'Camera unavailable. Enter codes manually.' })
      }
    }
    startScanner()
    return () => {
      isMounted = false
      if (scannerRef.current?.clear) {
        scannerRef.current.clear().catch(() => scannerRef.current?.stop?.())
      }
      if (clearDuplicateTimer.current) clearTimeout(clearDuplicateTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualToken.trim()) return
    validateToken(manualToken)
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
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>Use your device camera or enter a claim code manually.</p>
            {eventDetails && (
              <p style={{ margin: '0.35rem 0 0', color: 'var(--gray-700)' }}>
                {eventDetails.title}
                {eventDetails.venueName ? ` · ${eventDetails.venueName}` : ''}
              </p>
            )}
          </div>
          <div className="card" style={{ margin: 0, minWidth: 260 }}>
            <div className="card-body" style={{ display: 'grid', gap: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Event</label>
              <select
                className="form-input"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                disabled={eventsLoading && !events.length}
              >
                <option value="">Choose event (optional)</option>
                {events.map(item => {
                  const formattedDate = formatEventDate(item.subtitle)
                  return (
                    <option key={item.id} value={item.id}>
                      {item.title}
                      {formattedDate ? ` · ${formattedDate}` : ''}
                    </option>
                  )
                })}
              </select>
              {eventsError && <p style={{ margin: 0, color: 'var(--danger-600)' }}>{eventsError}</p>}
              <label className="form-label" style={{ marginBottom: 0 }}>Venue ID</label>
              <input
                className="form-input"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                placeholder="Optional venue filter"
              />
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            marginTop: '1.5rem',
            borderColor: themedStyle.borderColor,
            background: themedStyle.background,
            color: themedStyle.color
          }}
        >
          <div className="card-body" style={{ display: 'grid', gap: '0.5rem' }}>
            <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>{status.label}</p>
            {status.detail && <p style={{ margin: 0 }}>{status.detail}</p>}
            {status.attendee && <p style={{ margin: 0 }}>Attendee: {status.attendee}</p>}
            {status.ticketId && <p style={{ margin: 0 }}>Ticket ID: {status.ticketId}</p>}
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body" style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div>
              <div id="qr-reader" style={{ width: '100%', minHeight: 320 }} />
              <p style={{ color: 'var(--gray-600)', marginTop: '0.75rem' }}>Align the QR or barcode within the box.</p>
            </div>
            <div>
              <form onSubmit={handleManualSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: 0 }}>Manual code</label>
                  <input
                    className="form-input"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Enter claim or barcode value"
                  />
                </div>
                <button className="btn btn-primary" type="submit">Validate</button>
              </form>
              <div style={{ marginTop: '1.5rem' }}>
                <p className="card-title" style={{ marginTop: 0 }}>Recent scans</p>
                {history.length === 0 && <p style={{ color: 'var(--gray-600)', margin: 0 }}>No scans yet.</p>}
                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
                  {history.map(item => (
                    <div
                      key={item.id}
                      className="card"
                      style={{
                        margin: 0,
                        borderColor: item.phase === 'success' ? 'var(--green-200, #a7f3d0)' : 'var(--rose-200, #fecdd3)',
                        background: item.phase === 'success' ? 'var(--green-50, #ecfdf5)' : 'var(--rose-50, #fff1f2)'
                      }}
                    >
                      <div className="card-body" style={{ display: 'grid', gap: '0.35rem' }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>
                          {item.phase === 'success' ? '✅ Valid' : '❌ Invalid'} · {item.at}
                        </p>
                        <p style={{ margin: 0 }}>{item.label}</p>
                        {item.detail && <p style={{ margin: 0, color: 'var(--gray-700)' }}>{item.detail}</p>}
                        {item.attendee && <p style={{ margin: 0, color: 'var(--gray-600)' }}>Attendee: {item.attendee}</p>}
                        <p style={{ margin: 0, color: 'var(--gray-500)', wordBreak: 'break-all' }}>{item.token}</p>
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
