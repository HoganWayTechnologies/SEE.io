import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { useAuth } from '../context/AuthContext'
import { api, getUserIdFromProfile } from '../services/api'
import SiteNav from '../components/SiteNav'
import { useRealtime } from '../context/RealtimeContext'

type Ticket = {
  id: string
  eventId?: string
  eventTitle: string
  eventDate: string
  venue: string
  status: 'active' | 'used' | 'refunded'
  barcode?: { type?: string; payload: string; expiresAt?: string }
  claimCode?: string | null
}

const mockTickets: Ticket[] = [
  { id: 'tix-01', eventTitle: 'Sunset Rooftop Sessions', eventDate: 'Dec 12, 2025', venue: 'Austin, TX', status: 'active' },
  { id: 'tix-02', eventTitle: 'React Summit', eventDate: 'Jan 5, 2026', venue: 'Seattle, WA', status: 'used' },
  { id: 'tix-03', eventTitle: 'Food Truck Fiesta', eventDate: 'Dec 20, 2025', venue: 'Portland, OR', status: 'active' }
]

export default function TicketsPage() {
  const auth = useAuth()
  const realtime = useRealtime()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [status, setStatus] = useState<string | null>('Loading tickets…')
  const [activeTicketCode, setActiveTicketCode] = useState<{ [key: string]: Ticket['barcode'] | null }>({})
  const [codeStatus, setCodeStatus] = useState<{ [key: string]: string | null }>({})
  const [transferEmail, setTransferEmail] = useState<{ [key: string]: string }>({})
  const [transferStatus, setTransferStatus] = useState<{ [key: string]: string | null }>({})
  const [refundStatus, setRefundStatus] = useState<{ [key: string]: string | null }>({})

  const toQrDataUrl = async (code: Ticket['barcode']): Promise<Ticket['barcode'] | null> => {
    if (!code) return null
    const payload = (code as any)?.payload || code
    if (typeof payload !== 'string') return code
    if (payload.startsWith('data:image')) return { ...code, payload }
    try {
      const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 360 })
      return { type: (code as any)?.type || 'QR', payload: dataUrl }
    } catch (err) {
      console.warn('Failed to render QR', err)
      return code
    }
  }

  const loadTickets = React.useCallback(async () => {
    const userId = getUserIdFromProfile(auth.profile)
    if (!auth.idToken || !userId) {
      setTickets(mockTickets)
      setStatus('Sign in to view your real tickets.')
      return
    }
    try {
      const resp = await api.fetchUserTickets(userId, auth.idToken)
      const list = Array.isArray(resp)
        ? resp
        : Array.isArray((resp as any)?.items)
          ? (resp as any).items
          : Array.isArray((resp as any)?.Items)
            ? (resp as any).Items
            : []
      const normalized = list.map((t: any) => {
        const rawDate = t.eventDate || t.EventDate || t.eventStartUtc || t.EventStartUtc || null
        const parsedDate = rawDate ? new Date(rawDate) : null
        const displayDate = parsedDate && !isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleString()
          : rawDate || 'Upcoming'
        const statusRaw = (t.status || t.Status || 'active')?.toString().toLowerCase()
        const status: Ticket['status'] =
          statusRaw === 'purchased' ? 'active' :
          (statusRaw === 'used' || statusRaw === 'redeemed') ? 'used' :
          (statusRaw === 'refunded' || statusRaw === 'cancelled' || statusRaw === 'canceled') ? 'refunded' :
          'active'
        const qr = t.barcode || t.Barcode || t.qrCode || t.QrCode
        const barcode = qr
          ? (typeof qr === 'string'
            ? { type: 'QR', payload: qr }
            : qr)
          : undefined
        return {
          id: t.id || t.Id,
          eventId: t.eventId || t.EventId,
          eventTitle: t.eventTitle || t.EventTitle || t.name || t.Name || 'Event',
          eventDate: displayDate,
          venue: t.venue || t.Venue || '',
          status,
          barcode,
          claimCode: t.claimCode || t.ClaimCode || null
        } as Ticket
      })
      setTickets(normalized.length ? normalized : [])
      setStatus(normalized.length ? null : 'No tickets found.')
    } catch (err: any) {
      setTickets(mockTickets)
      setStatus(err?.message || 'Unable to load tickets; showing sample data.')
    }
  }, [auth.idToken, auth.profile])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  useEffect(() => {
    const unsubStatus = realtime.addListener('ticketStatusUpdated', (payload: any) => {
      setRefundStatus(prev => ({ ...prev, [payload.ticketId]: `Status: ${payload.status}` }))
      loadTickets()
    })
    const unsubDelivery = realtime.addListener('ticketDelivery', (payload: any) => {
      setRefundStatus(prev => ({ ...prev, [payload.ticketId]: payload.success ? 'Delivered' : payload.error || 'Delivery failed' }))
      loadTickets()
    })
    return () => {
      unsubStatus()
      unsubDelivery()
    }
  }, [realtime, loadTickets])

  if (!auth.isReady) {
    return <div className="container" style={{ padding: '3rem 0' }}><p>Loading tickets…</p></div>
  }

  if (!auth.idToken) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>My Tickets</h1>
        <p>Sign in to access your tickets and check-in codes.</p>
        <Link to="/auth" className="btn btn-primary">Sign In</Link>
      </div>
    )
  }

  return (
    <div>
      <SiteNav links={[{ to: '/discover', label: 'Discover' }, { to: '/tickets', label: 'My Tickets' }]} activePath="/tickets" />

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>My Tickets</h1>
          <p style={{ color: 'var(--gray-600)' }}>Access your tickets, QR codes, and purchase history.</p>
        </header>
        {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
        <div
          className="grid grid-cols-3"
          style={{
            gap: '1rem',
            display: 'flex',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            scrollSnapType: 'x mandatory'
          }}
        >
          {tickets.map(ticket => (
            <div
              className="card"
              key={ticket.id}
              style={{
                minWidth: '280px',
                scrollSnapAlign: 'start',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
              }}
            >
              <div className="card-body">
                <h3 className="card-title">{ticket.eventTitle}</h3>
                <p style={{ margin: 0, color: 'var(--gray-600)' }}>{ticket.eventDate}</p>
                <p style={{ margin: 0, color: 'var(--gray-600)' }}>{ticket.venue}</p>
                <span className={`badge badge-${ticket.status}`}>{ticket.status}</span>
                {ticket.claimCode && (
                  <div className="code-block" style={{ marginTop: '0.5rem' }}>
                    <small>Claim Code</small>
                    <code style={{ display: 'block' }}>{ticket.claimCode}</code>
                  </div>
                )}
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <input
                    className="form-input"
                    placeholder="Transfer to email"
                    value={transferEmail[ticket.id] || ''}
                    onChange={(e) => setTransferEmail(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={async () => {
                      if (!auth.idToken) {
                        setTransferStatus(prev => ({ ...prev, [ticket.id]: 'Sign in to transfer.' }))
                        return
                      }
                      const userId = getUserIdFromProfile(auth.profile)
                      if (!userId) {
                        setTransferStatus(prev => ({ ...prev, [ticket.id]: 'Missing user id.' }))
                        return
                      }
                      if (!transferEmail[ticket.id]) {
                        setTransferStatus(prev => ({ ...prev, [ticket.id]: 'Enter an email to transfer.' }))
                        return
                      }
                      try {
                        setTransferStatus(prev => ({ ...prev, [ticket.id]: 'Transferring…' }))
                        await api.transferTicket(userId, ticket.id, auth.idToken, { toEmail: transferEmail[ticket.id] })
                        setTransferStatus(prev => ({ ...prev, [ticket.id]: 'Transfer requested.' }))
                      } catch (err: any) {
                        setTransferStatus(prev => ({ ...prev, [ticket.id]: err?.message || 'Transfer failed' }))
                      }
                    }}
                  >
                    Transfer
                  </button>
                  {transferStatus[ticket.id] && <p style={{ color: 'var(--gray-600)', margin: 0 }}>{transferStatus[ticket.id]}</p>}
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: '0.75rem' }}
                  onClick={async () => {
                    if (!auth.idToken || !ticket.eventId) {
                      setCodeStatus(prev => ({ ...prev, [ticket.id]: 'Sign in to view code.' }))
                      return
                    }
                    if (activeTicketCode[ticket.id]) {
                      setActiveTicketCode(prev => ({ ...prev, [ticket.id]: null }))
                      setCodeStatus(prev => ({ ...prev, [ticket.id]: null }))
                      return
                    }
                    setCodeStatus(prev => ({ ...prev, [ticket.id]: 'Fetching code…' }))
                    try {
                      const code = ticket.barcode || await api.fetchTicketBarcode(ticket.eventId, ticket.id, auth.idToken)
                      const rendered = await toQrDataUrl(code as any)
                      setActiveTicketCode(prev => ({ ...prev, [ticket.id]: rendered }))
                      setCodeStatus(prev => ({ ...prev, [ticket.id]: code?.expiresAt ? `Expires ${code.expiresAt}` : null }))
                    } catch (err: any) {
                      setCodeStatus(prev => ({ ...prev, [ticket.id]: err?.message || 'Unable to load code' }))
                    }
                  }}
                >
                  {activeTicketCode[ticket.id] ? 'Hide Ticket' : 'View Ticket'}
                </button>
                {activeTicketCode[ticket.id] && (
                  <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                    {activeTicketCode[ticket.id]?.payload?.startsWith('data:image') ? (
                      <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.75rem', display: 'inline-block', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
                        <img
                          src={activeTicketCode[ticket.id]!.payload}
                          alt="Ticket QR code"
                          style={{ width: '220px', height: '220px', objectFit: 'contain' }}
                        />
                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '0.4rem' }}>
                          {ticket.eventTitle}
                        </div>
                      </div>
                    ) : (
                      <div className="code-block">
                        <small>{activeTicketCode[ticket.id]?.type || 'QR'}</small>
                        <code style={{ display: 'block', wordBreak: 'break-all' }}>{activeTicketCode[ticket.id]?.payload}</code>
                      </div>
                    )}
                  </div>
                )}
                {codeStatus[ticket.id] && <p style={{ color: 'var(--gray-600)', marginTop: '0.5rem' }}>{codeStatus[ticket.id]}</p>}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={async () => {
                      if (!auth.idToken || !ticket.eventId) {
                        setRefundStatus(prev => ({ ...prev, [ticket.id]: 'Sign in to resend.' }))
                        return
                      }
                      try {
                        setRefundStatus(prev => ({ ...prev, [ticket.id]: 'Resending…' }))
                        await api.resendTicket(ticket.eventId, ticket.id, auth.idToken)
                        setRefundStatus(prev => ({ ...prev, [ticket.id]: 'Sent.' }))
                      } catch (err: any) {
                        setRefundStatus(prev => ({ ...prev, [ticket.id]: err?.message || 'Resend failed' }))
                      }
                    }}
                  >
                    Resend
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={async () => {
                      if (!auth.idToken || !ticket.eventId) {
                        setRefundStatus(prev => ({ ...prev, [ticket.id]: 'Sign in to request refund.' }))
                        return
                      }
                      try {
                        setRefundStatus(prev => ({ ...prev, [ticket.id]: 'Requesting refund…' }))
                        await api.refundTicket(ticket.eventId, ticket.id, { reason: 'user_requested' }, auth.idToken)
                        setRefundStatus(prev => ({ ...prev, [ticket.id]: 'Refund requested.' }))
                      } catch (err: any) {
                        setRefundStatus(prev => ({ ...prev, [ticket.id]: err?.message || 'Refund request failed' }))
                      }
                    }}
                  >
                    Refund
                  </button>
                </div>
                {refundStatus[ticket.id] && <p style={{ color: 'var(--gray-600)', margin: 0 }}>{refundStatus[ticket.id]}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
