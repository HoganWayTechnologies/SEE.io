import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import SiteNav from '../components/SiteNav'
import KpiCard from '../components/KpiCard'
import MetricsTable from '../components/MetricsTable'
import { formatMoney, formatNumber } from '../utils/format'
import { createSeeClient, formatSeeApiError } from '../api/seeClient'

export default function PublisherDashboard() {
  const auth = useAuth()
  const client = useMemo(() => createSeeClient({ getToken: () => auth.idToken }), [auth.idToken])
  const [events, setEvents] = useState<any[]>([])
  const [status, setStatus] = useState<string | null>('Loading events…')
  const [selectedDiscounts, setSelectedDiscounts] = useState<{ [key: string]: any[] }>({})
  const [discountStatus, setDiscountStatus] = useState<{ [key: string]: string | null }>({})
  const [pageStatus, setPageStatus] = useState<{ [key: string]: string | null }>({})
  const [overview, setOverview] = useState<any | null>(null)
  const [metricsStatus, setMetricsStatus] = useState<string | null>(null)
  const [topRevenueEvents, setTopRevenueEvents] = useState<any[]>([])
  const [topViewEvents, setTopViewEvents] = useState<any[]>([])
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
    const loadMetrics = async () => {
      if (!auth.idToken || !businessId) {
        setMetricsStatus('Sign in to view metrics.')
        return
      }
      setMetricsStatus(null)
      try {
        const toUtc = new Date()
        const fromUtc = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const [overviewResp, revenueResp, viewsResp] = await Promise.all([
          client.fetchBusinessMetricsOverview({ businessId, fromUtc: fromUtc.toISOString(), toUtc: toUtc.toISOString() }),
          client.fetchBusinessMetricsEvents({ businessId, fromUtc: fromUtc.toISOString(), toUtc: toUtc.toISOString(), sort: 'revenue', take: 5 }),
          client.fetchBusinessMetricsEvents({ businessId, fromUtc: fromUtc.toISOString(), toUtc: toUtc.toISOString(), sort: 'views', take: 5 })
        ])
        setOverview(overviewResp)
        setTopRevenueEvents(revenueResp?.items || revenueResp?.events || revenueResp || [])
        setTopViewEvents(viewsResp?.items || viewsResp?.events || viewsResp || [])
      } catch (err) {
        const formatted = formatSeeApiError(err, 'Unable to load metrics.')
        setMetricsStatus(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
      }
    }
    loadMetrics()
  }, [auth.idToken, businessId, client])

  useEffect(() => {
    const loadEvents = async () => {
      if (!auth.idToken) {
        setStatus('Sign in as a publisher to manage events.')
        return
      }
      try {
        const now = new Date()
        const fromUtc = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const metricsMap: Record<string, any> = {}
        if (businessId) {
          try {
            const metricsResp = await client.fetchBusinessMetricsEvents({
              businessId,
              fromUtc: fromUtc.toISOString(),
              toUtc: now.toISOString(),
              sort: 'revenue',
              take: 200
            })
            const list = metricsResp?.items || metricsResp?.events || metricsResp || []
            list.forEach((item: any) => {
              const id = item.id || item.eventId || item.Id
              if (id) metricsMap[id] = item
            })
          } catch {
            // ignore metrics map failures
          }
        }
        const resp = await client.listPublisherEvents({ businessId })
        const normalized =
          (Array.isArray((resp as any)?.items) && (resp as any).items) ||
          (Array.isArray((resp as any)?.Items) && (resp as any).Items) ||
          (Array.isArray((resp as any)?.events) && (resp as any).events) ||
          (Array.isArray(resp) ? resp : [])
        const normalizedWithIds = normalized.map((evt: any) => ({
          ...evt,
          id: evt.id || evt.eventId || evt.Id,
          title: evt.title || evt.Title,
          status: evt.status || evt.Status,
          metrics: metricsMap[evt.id || evt.eventId || evt.Id] || null
        }))
        const enriched = await Promise.all(
          normalizedWithIds.map(async (evt: any) => {
            const eventId = evt.id || evt.eventId
            if (!eventId) return evt
            const result: any = { ...evt }
            const interactionsResult = await Promise.allSettled([
              api.fetchPublisherEventInteractions(eventId, auth.idToken!, { businessId: businessId || undefined })
            ])
            if (interactionsResult[0].status === 'fulfilled') result.interactions = interactionsResult[0].value
            return result
          })
        )
        setEvents(enriched)
        setStatus(enriched.length ? null : 'No events yet. Create one to get started.')
      } catch (err: any) {
        setEvents([])
        const formatted = formatSeeApiError(err, 'Failed to load publisher events.')
        setStatus(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
      }
    }
    loadEvents()
  }, [auth.idToken, businessId, client])

  if (!auth.idToken || !auth.profile) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Publisher Console</h1>
        <p>Please sign in with a publisher account to manage events.</p>
        <Link to="/auth" className="btn btn-primary">Sign In</Link>
      </div>
    )
  }

  const totals = overview?.totals || overview?.Totals || {}
  const needsAttention = events.filter(evt => {
    const statusValue = (evt.status || evt.Status || '').toLowerCase()
    if (statusValue.includes('draft') || statusValue.includes('pending')) return true
    const views = evt.interactions?.views ?? 0
    const startUtc = evt.startUtc || evt.startDate || evt.StartUtc
    if (views < 20 && startUtc) {
      const start = new Date(startUtc)
      if (!Number.isNaN(start.getTime())) {
        return Date.now() - start.getTime() > 24 * 60 * 60 * 1000
      }
    }
    return false
  })
  return (
    <div>
      <SiteNav
        activePath="/publisher"
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/publisher', label: 'Publisher Console' },
          { to: '/publisher/events', label: 'Events' },
          { to: '/publisher/analytics', label: 'Analytics' },
          { to: '/publisher/notifications', label: 'Notifications' }
        ]}
      />

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Publisher Dashboard</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Monitor and manage the events you have published to SEE.io.
          </p>
        </header>

        <section className="grid" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Last 7 days</h3>
              {metricsStatus && <p style={{ color: 'var(--gray-600)' }}>{metricsStatus}</p>}
              {!metricsStatus && (
                <div className="grid grid-cols-3" style={{ gap: '0.5rem' }}>
                  <KpiCard label="Views" value={formatNumber(totals.eventViews || 0)} />
                  <KpiCard label="Checkout" value={formatNumber(totals.checkoutStarted || 0)} />
                  <KpiCard label="Revenue" value={formatMoney(totals.grossRevenueCents || 0)} />
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Events needing attention</h3>
              {needsAttention.length === 0 && <p style={{ color: 'var(--gray-600)' }}>You are all caught up.</p>}
              {needsAttention.length > 0 && (
                <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                  {needsAttention.slice(0, 4).map(event => (
                    <li key={event.id || event.eventId}>
                      <Link to={`/publisher/events/${event.id || event.eventId}`} className="nav-link">
                        {event.title || event.name || 'Event'}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Quick actions</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link to="/publisher/events/new" className="btn btn-primary">Create new event</Link>
                <Link to={businessId ? `/business/${businessId}` : '/profile'} className="btn btn-secondary">
                  Share your venue page
                </Link>
                <Link to="/publisher/notifications" className="btn btn-secondary">View notifications</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2" style={{ gap: '1rem', marginTop: '2rem' }}>
          <MetricsTable
            title="Top events by revenue"
            data={topRevenueEvents}
            columns={[
              {
                key: 'title',
                header: 'Event',
                render: (row: any) => {
                  const eventId = row.id || row.eventId || row.Id
                  const label = row.title || row.name || row.Name || 'Event'
                  return eventId ? <Link to={`/publisher/events/${eventId}/analytics`}>{label}</Link> : label
                }
              },
              { key: 'revenue', header: 'Revenue', render: (row: any) => formatMoney(row.grossRevenueCents || row.revenueCents || 0) }
            ]}
            emptyMessage="No revenue data yet."
          />
          <MetricsTable
            title="Top events by views"
            data={topViewEvents}
            columns={[
              {
                key: 'title',
                header: 'Event',
                render: (row: any) => {
                  const eventId = row.id || row.eventId || row.Id
                  const label = row.title || row.name || row.Name || 'Event'
                  return eventId ? <Link to={`/publisher/events/${eventId}/analytics`}>{label}</Link> : label
                }
              },
              { key: 'views', header: 'Views', render: (row: any) => formatNumber(row.views || row.eventViews || 0) }
            ]}
            emptyMessage="No view data yet."
          />
        </section>

        <section style={{ marginTop: '2rem' }}>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>Your Events</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary">Import from discovery</button>
                  <Link to="/publisher/events/new" className="btn btn-primary">Create event</Link>
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
                  <th>Ticket Clicks</th>
                  <th>Views</th>
                  <th>Revenue</th>
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
                    <td>{event.interactions?.ticketClicks ?? '—'}</td>
                    <td>{event.interactions?.views ?? '—'}</td>
                    <td>{event.metrics ? formatMoney(event.metrics.grossRevenueCents || event.metrics.revenueCents || 0) : '—'}</td>
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
