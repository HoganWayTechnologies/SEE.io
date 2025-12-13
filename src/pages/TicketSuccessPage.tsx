import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import SiteNav from '../components/SiteNav'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function TicketSuccessPage() {
  const { eventId } = useParams()
  const auth = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<any[]>([])
  const [status, setStatus] = useState<string | null>('Loading your tickets…')
  const [qrMap, setQrMap] = useState<Record<string, string>>({})

  const loadTickets = async () => {
    if (!eventId || !auth.idToken) {
      setStatus('Sign in to view your tickets.')
      return
    }
    try {
      setStatus('Loading your tickets…')
      const resp = await api.fetchMyEventTickets(eventId, auth.idToken)
      const list = Array.isArray((resp as any)?.items) ? (resp as any).items : Array.isArray(resp) ? resp : []
      setTickets(list)
      setStatus(list.length ? null : 'No tickets found for this event yet. Try refreshing in a moment.')
    } catch (err: any) {
      setStatus(err?.message || 'Unable to load tickets right now.')
    }
  }

  useEffect(() => {
    loadTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.idToken, eventId])

  const tokenForTicket = useMemo(() => {
    return (ticket: any) => {
      return ticket?.token || ticket?.barcode?.payload || ticket?.payload || ticket?.code || ''
    }
  }, [])

  const qrText = (ticket: any) => {
    const token = tokenForTicket(ticket)
    if (!token) return ''
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      return `${origin}/t?t=${encodeURIComponent(token)}`
    } catch {
      return token
    }
  }

  useEffect(() => {
    const generateQr = async () => {
      const next: Record<string, string> = {}
      for (const ticket of tickets) {
        const token = tokenForTicket(ticket)
        if (!token) continue
        const value = qrText(ticket)
        try {
          const dataUrl = await QRCode.toDataURL(value || token)
          next[ticket.id || token] = dataUrl
        } catch {
          // ignore QR failures and continue
        }
      }
      setQrMap(next)
    }
    generateQr()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets])

  return (
    <div>
      <SiteNav />
      <div className="container" style={{ padding: '2.5rem 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>SEE tickets</p>
          <h1 style={{ margin: 0 }}>Tickets confirmed</h1>
          <p style={{ color: 'var(--gray-600)' }}>Show this QR at the door. We also emailed your ticket(s).</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={loadTickets}>Refresh tickets</button>
          {eventId && <Link to={`/event/${eventId}`} className="btn btn-secondary">Back to event</Link>}
        </div>
        {status && <p style={{ textAlign: 'center', color: 'var(--gray-600)' }}>{status}</p>}

        <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
          {tickets.map(ticket => {
            const token = tokenForTicket(ticket)
            const ticketKey = ticket.id || token
            const qrSrc = ticketKey ? qrMap[ticketKey] : null
            return (
              <div key={ticketKey || token} className="card">
                <div className="card-body" style={{ display: 'grid', gap: '0.5rem' }}>
                  <p className="card-title" style={{ margin: 0 }}>{ticket.name || 'Ticket'}</p>
                  <p style={{ margin: 0, color: 'var(--gray-600)' }}>{ticket.eventTitle || ticket.eventName || ''}</p>
                  <p style={{ margin: 0, color: 'var(--gray-600)' }}>{ticket.eventDate || ticket.date}</p>
                  {token ? (
                    <div style={{ justifySelf: 'center', padding: '0.5rem', background: 'var(--gray-50)', borderRadius: '0.75rem', textAlign: 'center' }}>
                      {qrSrc ? (
                        <img src={qrSrc} alt="Ticket QR code" style={{ width: 180, height: 180, objectFit: 'contain' }} />
                      ) : (
                        <p style={{ color: 'var(--gray-600)', margin: 0 }}>Generating QR…</p>
                      )}
                      <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '0.5rem', wordBreak: 'break-all' }}>{token}</p>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--gray-600)', margin: 0 }}>Token not available yet.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!auth.idToken && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--gray-600)' }}>Sign in to view and refresh your tickets.</p>
            <button className="btn btn-primary" onClick={() => navigate('/auth')}>Sign in</button>
          </div>
        )}
      </div>
    </div>
  )
}
