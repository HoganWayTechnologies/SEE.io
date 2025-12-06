import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import SiteNav from '../components/SiteNav'

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
  const businessId = useMemo(() => {
    if (auth.primaryBusinessId) return auth.primaryBusinessId
    if (auth.businessMemberships?.length) {
      return auth.businessMemberships[0]?.businessId || null
    }
    if (!auth.profile) return null
    return (
      auth.profile.businessId ||
      auth.profile.business?.id ||
      auth.profile.business?.businessId ||
      auth.profile.publisher?.businessId ||
      auth.profile.businesses?.[0]?.id ||
      null
    )
  }, [auth.primaryBusinessId, auth.businessMemberships, auth.profile])

  useEffect(() => {
    const loadEvents = async () => {
      if (!auth.idToken) {
        setStatus('Sign in as a publisher to manage events.')
        return
      }
      try {
        const resp = await api.fetchPublisherEventsAuthorized(auth.idToken)
        const normalized =
          (Array.isArray((resp as any)?.items) && (resp as any).items) ||
          (Array.isArray((resp as any)?.Items) && (resp as any).Items) ||
          (Array.isArray((resp as any)?.events) && (resp as any).events) ||
          (Array.isArray(resp) ? resp : [])
        const normalizedWithIds = normalized.map((evt: any) => ({
          ...evt,
          id: evt.id || evt.eventId || evt.Id,
          title: evt.title || evt.Title,
          status: evt.status || evt.Status
        }))
        const enriched = await Promise.all(
          normalizedWithIds.map(async (evt: any) => {
            const eventId = evt.id || evt.eventId
            if (!eventId) return evt
            const result: any = { ...evt }
            const [statsResult, interactionsResult] = await Promise.allSettled([
              api.fetchPublisherEventStats(eventId, auth.idToken!),
              api.fetchPublisherEventInteractions(eventId, auth.idToken!)
            ])
            if (statsResult.status === 'fulfilled') result.stats = statsResult.value
            if (interactionsResult.status === 'fulfilled') result.interactions = interactionsResult.value
            return result
          })
        )
        setEvents(enriched)
        setStatus(enriched.length ? null : 'No events yet. Create one to get started.')
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
      <SiteNav
        activePath="/publisher"
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/publisher', label: 'Publisher Console' },
          { to: '/reports', label: 'Reports' },
          { to: '/saved', label: 'Saved' },
          { to: '/tickets', label: 'My Tickets' }
        ]}
      />

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
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Business Profile</h3>
              {businessId ? (
                <>
                  <p style={{ color: 'var(--gray-600)' }}>Customize your public profile page and highlight playlists, offers, or merch.</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link to={`/publisher/business/${businessId}/page`} className="btn btn-primary">Customize Page</Link>
                    <Link to={`/business/${businessId}`} className="btn btn-secondary">View Live Page</Link>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--gray-600)' }}>Upgrade to a business account to unlock profile customization.</p>
                  <Link to="/settings" className="btn btn-secondary">Upgrade</Link>
                </>
              )}
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
                  <th>Engagement</th>
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
                      {event.interactions ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-800)', lineHeight: 1.6 }}>
                          <div><strong>Clicks:</strong> {event.interactions.clicks}</div>
                          <div><strong>Saves:</strong> {event.interactions.saves}</div>
                          <div><strong>Shares:</strong> {event.interactions.shares}</div>
                          <div><strong>Tickets:</strong> {event.interactions.ticketClicks}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--gray-500)' }}>—</span>
                      )}
                    </td>
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
