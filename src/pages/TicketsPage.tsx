import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UserMenu from '../components/UserMenu'
import { useAuth } from '../context/AuthContext'
import { api, getUserIdFromProfile } from '../services/api'

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
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [status, setStatus] = useState<string | null>('Loading tickets…')
  const [activeTicketCode, setActiveTicketCode] = useState<{ [key: string]: Ticket['barcode'] | null }>({})
  const [codeStatus, setCodeStatus] = useState<{ [key: string]: string | null }>({})
  const [transferEmail, setTransferEmail] = useState<{ [key: string]: string }>({})
  const [transferStatus, setTransferStatus] = useState<{ [key: string]: string | null }>({})

  useEffect(() => {
    const loadTickets = async () => {
      const userId = getUserIdFromProfile(auth.profile)
      if (!auth.idToken || !userId) {
        setTickets(mockTickets)
        setStatus('Sign in to view your real tickets.')
        return
      }
      try {
        const resp = await api.fetchUserTickets(userId, auth.idToken)
        const normalized = Array.isArray(resp) ? resp : (resp?.items || [])
        setTickets(normalized.length ? normalized.map(t => ({
          id: t.id,
          eventId: t.eventId,
          eventTitle: t.eventTitle || t.name || 'Event',
          eventDate: t.eventDate,
          venue: t.venue,
          status: (t.status as any) || 'active',
          barcode: t.barcode || (t.qrCode ? { type: 'QR', payload: t.qrCode } : undefined),
          claimCode: (t as any).claimCode
        })) : [])
        setStatus(normalized.length ? null : 'No tickets found.')
      } catch (err: any) {
        setTickets(mockTickets)
        setStatus(err?.message || 'Unable to load tickets; showing sample data.')
      }
    }
    loadTickets()
  }, [auth.idToken])

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
      <nav className="nav">
        <div className="container nav-container">
          <Link to="/" className="nav-brand">SEE.io</Link>
          <div className="nav-links">
            <Link to="/discover" className="nav-link">Discover</Link>
            <Link to="/tickets" className="nav-link active">My Tickets</Link>
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>My Tickets</h1>
          <p style={{ color: 'var(--gray-600)' }}>Access your tickets, QR codes, and purchase history.</p>
        </header>
        {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
        <div className="grid grid-cols-3" style={{ gap: '1rem' }}>
          {tickets.map(ticket => (
            <div className="card" key={ticket.id}>
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
                    setCodeStatus(prev => ({ ...prev, [ticket.id]: 'Fetching code…' }))
                    try {
                      const code = ticket.barcode || await api.fetchTicketBarcode(ticket.eventId, ticket.id, auth.idToken)
                      setActiveTicketCode(prev => ({ ...prev, [ticket.id]: code }))
                      setCodeStatus(prev => ({ ...prev, [ticket.id]: code?.expiresAt ? `Expires ${code.expiresAt}` : null }))
                    } catch (err: any) {
                      setCodeStatus(prev => ({ ...prev, [ticket.id]: err?.message || 'Unable to load code' }))
                    }
                  }}
                >
                  View Ticket
                </button>
                {activeTicketCode[ticket.id] && (
                  <div style={{ marginTop: '0.75rem' }}>
                    {activeTicketCode[ticket.id]?.payload?.startsWith('data:image') ? (
                      <img src={activeTicketCode[ticket.id]!.payload} alt="Ticket code" style={{ width: '100%' }} />
                    ) : (
                      <div className="code-block">
                        <small>{activeTicketCode[ticket.id]?.type || 'QR'}</small>
                        <code style={{ display: 'block', wordBreak: 'break-all' }}>{activeTicketCode[ticket.id]?.payload}</code>
                      </div>
                    )}
                  </div>
                )}
                {codeStatus[ticket.id] && <p style={{ color: 'var(--gray-600)', marginTop: '0.5rem' }}>{codeStatus[ticket.id]}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
