import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import UserMenu from '../components/UserMenu'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

const mockTasks = [
  'Upload hero image for your upcoming event',
  'Set ticket allocations',
  'Submit compliance documents'
]

export default function PublisherDashboard() {
  const auth = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [status, setStatus] = useState<string | null>('Loading events…')
  const [tasks, setTasks] = useState<string[]>(mockTasks)
  const [selectedDiscounts, setSelectedDiscounts] = useState<{ [key: string]: any[] }>({})
  const [discountStatus, setDiscountStatus] = useState<{ [key: string]: string | null }>({})
  const [pageStatus, setPageStatus] = useState<{ [key: string]: string | null }>({})

  useEffect(() => {
    const loadEvents = async () => {
      if (!auth.idToken) {
        setStatus('Sign in as a publisher to manage events.')
        return
      }
      try {
        const resp = await api.fetchPublisherEventsAuthorized(auth.idToken)
        const normalized = Array.isArray(resp?.items) ? resp.items : (resp.events || resp || [])
        const enriched = await Promise.all(normalized.map(async (evt: any) => {
          try {
            const stats = await api.fetchPublisherEventStats(evt.id || evt.eventId, auth.idToken!)
            return { ...evt, stats }
          } catch {
            return evt
          }
        }))
        setEvents(enriched)
        setStatus(normalized.length ? null : 'No events yet. Create one to get started.')
      } catch (err: any) {
        setEvents([])
        setStatus(err?.message || 'Failed to load publisher events')
      }
    }
    loadEvents()
  }, [auth.idToken])

  useEffect(() => {
    const loadTasks = async () => {
      if (!auth.idToken) return
      try {
        const resp = await api.fetchPublisherTasks(auth.idToken)
        const list = Array.isArray(resp?.items) ? resp.items : (resp?.tasks || resp || [])
        const labels = list.map((task: any) => task.title || task.description).filter(Boolean)
        if (labels.length) setTasks(labels)
      } catch {
        // keep defaults
      }
    }
    loadTasks()
  }, [auth.idToken])

  if (!auth.idToken || !auth.profile) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Publisher Console</h1>
        <p>Please sign in with a publisher account to manage events.</p>
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
            <Link to="/publisher" className="nav-link active">Publisher Console</Link>
            <Link to="/reports" className="nav-link">Reports</Link>
            <Link to="/saved" className="nav-link">Saved</Link>
            <Link to="/tickets" className="nav-link">My Tickets</Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Publisher Dashboard</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Monitor and manage the events you have published to SEE.io.
          </p>
        </header>

        <section className="grid" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Quick Stats</h3>
              <p><strong>Total events:</strong> {events.length}</p>
              <p><strong>Active/planning:</strong> {events.filter(evt => evt.status && evt.status !== 'draft').length}</p>
              <p><strong>Drafts:</strong> {events.filter(evt => evt.status === 'draft').length}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Tasks</h3>
              <ul style={{ paddingLeft: '1.25rem' }}>
                {tasks.map(task => <li key={task}>{task}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>Your Events</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary">Import from discovery</button>
                  <Link to="/publisher/create" className="btn btn-primary">Create event</Link>
                </div>
            </div>
            {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
            {!status && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ padding: '0.5rem 0' }}>Title</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Tickets Sold</th>
                  <th>Views</th>
                  <th>Discounts</th>
                  <th>Page</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id || event.eventId} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.75rem 0' }}>{event.title || event.name}</td>
                    <td><span className={`badge badge-${(event.status || 'active').toLowerCase()}`}>{event.status || 'active'}</span></td>
                    <td>{event.date || event.startDate || event.startUtc || 'TBD'}</td>
                    <td>{event.ticketsSold ?? event.stats?.ticketsSold ?? '—'}</td>
                    <td>{event.views ?? event.stats?.views ?? '—'}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={async () => {
                          if (!auth.idToken) return
                          try {
                            setDiscountStatus(prev => ({ ...prev, [event.id]: 'Loading...' }))
                            const discounts = await api.fetchDiscounts(event.id || event.eventId, auth.idToken)
                            setSelectedDiscounts(prev => ({ ...prev, [event.id || event.eventId]: discounts }))
                            setDiscountStatus(prev => ({ ...prev, [event.id]: null }))
                          } catch (err: any) {
                            setSelectedDiscounts(prev => ({ ...prev, [event.id || event.eventId]: [] }))
                            setDiscountStatus(prev => ({ ...prev, [event.id]: err?.message || 'Failed to load' }))
                          }
                        }}
                      >
                        View
                      </button>
                      {discountStatus[event.id] && <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{discountStatus[event.id]}</div>}
                      {selectedDiscounts[event.id || event.eventId]?.length > 0 && (
                        <ul style={{ paddingLeft: '1rem', margin: '0.5rem 0 0 0', color: 'var(--gray-700)' }}>
                          {selectedDiscounts[event.id || event.eventId].map((d: any) => (
                            <li key={d.id || d.code}>
                              <strong>{d.code || 'Discount'}</strong> — {d.percentOff ? `${d.percentOff}% off` : d.amountOff ? `$${d.amountOff}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={async () => {
                          if (!auth.idToken) return
                          try {
                            setPageStatus(prev => ({ ...prev, [event.id]: 'Loading...' }))
                            const page = await api.fetchEventPage(event.id || event.eventId, auth.idToken)
                            setPageStatus(prev => ({ ...prev, [event.id]: page?.draft ? 'Draft loaded' : 'No draft yet' }))
                          } catch (err: any) {
                            setPageStatus(prev => ({ ...prev, [event.id]: err?.message || 'Failed to load page' }))
                          }
                        }}
                      >
                        Edit page
                      </button>
                      {pageStatus[event.id] && <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{pageStatus[event.id]}</div>}
                    </td>
                    <td>
                      <Link to={`/publisher/events/${event.id || event.eventId}`} className="nav-link">Manage</Link>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
