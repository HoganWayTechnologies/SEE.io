import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UserMenu from '../components/UserMenu'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

type PublisherEvent = {
  id: string
  title?: string
  name?: string
  status?: string
  startUtc?: string
  city?: string
  state?: string
  pageVersionId?: string | null
  pageUpdatedAtUtc?: string | null
}

export default function MyEventsPage() {
  const auth = useAuth()
  const [events, setEvents] = useState<PublisherEvent[]>([])
  const [statusMsg, setStatusMsg] = useState<string | null>('Loading events…')
  const [filter, setFilter] = useState('all')
  const [ticketView, setTicketView] = useState<{ [key: string]: any[] }>({})
  const [ticketStatus, setTicketStatus] = useState<{ [key: string]: string | null }>({})
  const [actionStatus, setActionStatus] = useState<{ [key: string]: string | null }>({})

  const loadEvents = useCallback(async () => {
    if (!auth.idToken) {
      setEvents([])
      setStatusMsg('Sign in with a publisher account to see your events.')
      return
    }
    try {
      const resp = await api.fetchPublisherEventsAuthorized(auth.idToken)
      const list = Array.isArray(resp?.items) ? resp.items : (resp?.events || resp || [])
      setEvents(list)
      setStatusMsg(list.length ? null : 'No events yet. Create one to get started.')
    } catch (err: any) {
      setEvents([])
      setStatusMsg(err?.message || 'Unable to load events.')
    }
  }, [auth.idToken])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const filtered = events.filter(evt => {
    if (filter === 'all') return true
    return (evt.status || '').toLowerCase().includes(filter)
  })

  const loadTicketsForEvent = async (eventId: string) => {
    if (!auth.idToken) return
    setTicketStatus(prev => ({ ...prev, [eventId]: 'Loading tickets…' }))
    try {
      const resp = await api.fetchPublisherTickets(eventId, auth.idToken)
      setTicketView(prev => ({ ...prev, [eventId]: resp || [] }))
      setTicketStatus(prev => ({ ...prev, [eventId]: null }))
    } catch (err: any) {
      setTicketView(prev => ({ ...prev, [eventId]: [] }))
      setTicketStatus(prev => ({ ...prev, [eventId]: err?.message || 'Unable to load tickets' }))
    }
  }

  const publishEvent = async (eventId: string) => {
    if (!auth.idToken) return
    setActionStatus(prev => ({ ...prev, [eventId]: 'Publishing…' }))
    try {
      await api.publishPublisherEvent(eventId, auth.idToken)
      setActionStatus(prev => ({ ...prev, [eventId]: 'Published' }))
      await loadEvents()
    } catch (err: any) {
      setActionStatus(prev => ({ ...prev, [eventId]: err?.message || 'Failed to publish' }))
    }
  }

  const cancelEvent = async (eventId: string) => {
    if (!auth.idToken) return
    setActionStatus(prev => ({ ...prev, [eventId]: 'Canceling…' }))
    try {
      await api.cancelPublisherEvent(eventId, auth.idToken)
      setActionStatus(prev => ({ ...prev, [eventId]: 'Canceled' }))
      await loadEvents()
    } catch (err: any) {
      setActionStatus(prev => ({ ...prev, [eventId]: err?.message || 'Failed to cancel' }))
    }
  }

  const viewDiscounts = async (eventId: string) => {
    if (!auth.idToken) return
    setTicketStatus(prev => ({ ...prev, [eventId]: 'Loading discounts…' }))
    try {
      const discounts = await api.fetchDiscounts(eventId, auth.idToken)
      setTicketView(prev => ({ ...prev, [`discounts-${eventId}`]: discounts }))
      setTicketStatus(prev => ({ ...prev, [eventId]: null }))
    } catch (err: any) {
      setTicketView(prev => ({ ...prev, [`discounts-${eventId}`]: [] }))
      setTicketStatus(prev => ({ ...prev, [eventId]: err?.message || 'Unable to load discounts' }))
    }
  }

  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <Link to="/" className="nav-brand">SEE.io</Link>
          <div className="nav-links">
            <Link to="/discover" className="nav-link">Discover</Link>
            <Link to="/my-events" className="nav-link active">My Events</Link>
            <Link to="/saved" className="nav-link">Saved</Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>My Events</h1>
            <p style={{ color: 'var(--gray-600)' }}>Drafts, pending approval, approved, and expired events you manage.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/publisher" className="btn btn-secondary">Publisher Console</Link>
            <Link to="/publisher/create" className="btn btn-primary">Create Event</Link>
          </div>
        </header>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', 'pending', 'approved', 'rejected', 'expired', 'draft'].map(key => (
              <button
                key={key}
                className={`chip ${filter === key ? 'chip-active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {statusMsg && <p style={{ color: 'var(--gray-600)' }}>{statusMsg}</p>}
            {!statusMsg && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-200)' }}>
                    <th style={{ padding: '0.5rem 0' }}>Title</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>Location</th>
                    <th>Tickets</th>
                    <th>Discounts</th>
                    <th>Actions</th>
                    <th>Builder</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(evt => (
                    <tr key={evt.id || evt.eventId} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '0.75rem 0' }}>{evt.title || evt.name || 'Untitled'}</td>
                      <td><span className={`badge badge-${(evt.status || 'pending').toLowerCase()}`}>{evt.status || 'pending'}</span></td>
                      <td>{evt.startUtc || 'TBD'}</td>
                      <td>{evt.city || evt.state ? `${evt.city || ''}${evt.state ? ', ' + evt.state : ''}` : '—'}</td>
                      <td>
                        {ticketView[evt.id || evt.eventId || ''] ? (
                          <div style={{ fontSize: '0.9rem', color: 'var(--gray-800)' }}>
                            {ticketView[evt.id || evt.eventId || ''].length === 0 && 'No tickets'}
                            {ticketView[evt.id || evt.eventId || ''].length > 0 && ticketView[evt.id || evt.eventId || ''].map(ticket => ticket.name || ticket.title).join(', ')}
                            {ticketStatus[evt.id || evt.eventId || ''] && <div style={{ color: 'var(--gray-600)' }}>{ticketStatus[evt.id || evt.eventId || '']}</div>}
                          </div>
                        ) : (
                          <button className="btn btn-secondary" onClick={() => loadTicketsForEvent(evt.id || evt.eventId || '')}>
                            View tickets
                          </button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <Link to={`/publisher/events/${evt.id || evt.eventId || ''}`} className="nav-link">Manage</Link>
                          <button className="btn btn-secondary" onClick={() => publishEvent(evt.id || evt.eventId || '')}>Publish</button>
                          <button className="btn btn-secondary" onClick={() => cancelEvent(evt.id || evt.eventId || '')}>Cancel</button>
                        </div>
                        {actionStatus[evt.id || evt.eventId || ''] && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                            {actionStatus[evt.id || evt.eventId || '']}
                          </div>
                        )}
                      </td>
                      <td>
                        <Link to={`/publisher/events/${evt.id || evt.eventId || ''}/page`} className="btn btn-secondary">
                          Page builder
                        </Link>
                      </td>
                      <td>
                        {ticketView[`discounts-${evt.id || evt.eventId || ''}`] ? (
                          <div style={{ fontSize: '0.9rem', color: 'var(--gray-800)' }}>
                            {ticketView[`discounts-${evt.id || evt.eventId || ''}`].length === 0 && 'No discounts'}
                            {ticketView[`discounts-${evt.id || evt.eventId || ''}`].length > 0 && ticketView[`discounts-${evt.id || evt.eventId || ''}`].map((d: any) => d.code || 'Discount').join(', ')}
                            {ticketStatus[evt.id || evt.eventId || ''] && <div style={{ color: 'var(--gray-600)' }}>{ticketStatus[evt.id || evt.eventId || '']}</div>}
                          </div>
                        ) : (
                          <button className="btn btn-secondary" onClick={() => viewDiscounts(evt.id || evt.eventId || '')}>
                            View discounts
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
