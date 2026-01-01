import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import { useAuth } from '../context/AuthContext'
import { createSeeClient, formatSeeApiError, PublisherEventBasics } from '../api/seeClient'

const normalizeEvent = (item: any): PublisherEventBasics & { id: string } => {
  const id = (item?.id || item?.eventId || item?.Id || '').toString()
  return {
    id,
    eventId: item?.eventId || item?.EventId,
    title: item?.title || item?.Title || item?.name || item?.Name || 'Untitled event',
    status: item?.status || item?.Status || item?.state || 'draft',
    startUtc: item?.startUtc || item?.StartUtc || item?.startDate || null,
    endUtc: item?.endUtc || item?.EndUtc || item?.endDate || null,
    city: item?.city || item?.City || item?.venue?.city || null,
    state: item?.state || item?.State || item?.venue?.state || null,
    venueName: item?.venueName || item?.VenueName || item?.venue?.name || null
  }
}

const formatDateTime = (value?: string | null) => {
  if (!value) return 'TBD'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function PublisherEventsPage() {
  const auth = useAuth()
  const client = useMemo(() => createSeeClient({ getToken: () => auth.idToken }), [auth.idToken])
  const [events, setEvents] = useState<Array<PublisherEventBasics & { id: string }>>([])
  const [status, setStatus] = useState<string | null>('Loading events…')
  const [filter, setFilter] = useState('all')
  const [summaryReady, setSummaryReady] = useState<Record<string, boolean>>({})

  const businessId = useMemo(() => {
    return (
      auth.primaryBusinessId ||
      auth.profile?.primaryBusinessId ||
      auth.profile?.businessId ||
      auth.profile?.business?.id ||
      null
    )
  }, [auth.primaryBusinessId, auth.profile])

  const loadEvents = useCallback(async () => {
    if (!auth.idToken) {
      setStatus('Sign in to view publisher events.')
      setEvents([])
      return
    }
    setStatus('Loading events…')
    try {
      const resp = await client.listPublisherEvents({
        businessId,
        status: filter !== 'all' ? filter : undefined
      })
      const list = Array.isArray(resp?.items)
        ? resp.items
        : Array.isArray(resp?.events)
          ? resp.events
          : Array.isArray(resp)
            ? resp
            : []
      const normalized = list.map(normalizeEvent).filter(item => item.id)
      setEvents(normalized)
      setStatus(normalized.length ? null : 'No events yet. Create one to get started.')
    } catch (err) {
      const formatted = formatSeeApiError(err, 'Failed to load events.')
      setStatus(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
      setEvents([])
    }
  }, [auth.idToken, client, filter, businessId])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    const endedEvents = events.filter(event => {
      if (!event.endUtc) return false
      const end = new Date(event.endUtc)
      if (Number.isNaN(end.getTime())) return false
      return end.getTime() < Date.now()
    })
    if (endedEvents.length === 0) return
    const run = async () => {
      const updates: Record<string, boolean> = {}
      await Promise.all(
        endedEvents.map(async event => {
          if (!event.id || summaryReady[event.id]) return
          try {
            await client.fetchPostEventSummary(event.id)
            updates[event.id] = true
          } catch {
            updates[event.id] = false
          }
        })
      )
      if (Object.keys(updates).length) {
        setSummaryReady(prev => ({ ...prev, ...updates }))
      }
    }
    run()
  }, [events, client, summaryReady])

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true
    return (event.status || '').toLowerCase().includes(filter)
  })

  return (
    <div>
      <SiteNav
        activePath="/publisher/events"
        links={[
          { to: '/publisher', label: 'Dashboard' },
          { to: '/publisher/events', label: 'Events' },
          { to: '/publisher/analytics', label: 'Analytics' },
          { to: '/publisher/notifications', label: 'Notifications' }
        ]}
      />

      <div className="container" style={{ padding: '2.5rem 0' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Your events</h1>
            <p style={{ color: 'var(--gray-600)' }}>Manage drafts, live events, and post-event summaries.</p>
          </div>
          <Link to="/publisher/events/new" className="btn btn-primary">Create new event</Link>
        </header>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', 'draft', 'pending', 'active', 'approved', 'expired', 'canceled'].map(key => (
              <button key={key} className={`chip ${filter === key ? 'chip-active' : ''}`} onClick={() => setFilter(key)}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
            {!status && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-200)' }}>
                    <th style={{ padding: '0.5rem 0' }}>Event</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map(event => (
                    <tr key={event.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '0.75rem 0' }}>
                        <div style={{ fontWeight: 600 }}>{event.title}</div>
                        {summaryReady[event.id] && <span className="badge badge-active">Summary ready</span>}
                      </td>
                      <td>
                        <span className={`badge badge-${(event.status || 'draft').toLowerCase()}`}>{event.status || 'draft'}</span>
                      </td>
                      <td>{formatDateTime(event.startUtc)}</td>
                      <td>{event.venueName || [event.city, event.state].filter(Boolean).join(', ') || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <Link to={`/publisher/events/${event.id}`} className="nav-link">Manage</Link>
                          <Link to={`/publisher/events/${event.id}/analytics`} className="nav-link">Analytics</Link>
                          {summaryReady[event.id] && (
                            <Link to={`/publisher/events/${event.id}/summary`} className="nav-link">Summary</Link>
                          )}
                        </div>
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
