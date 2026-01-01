import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import DateRangePicker from '../components/DateRangePicker'
import MetricsKpiRow from '../components/MetricsKpiRow'
import MetricsCharts from '../components/MetricsCharts'
import MetricsTable from '../components/MetricsTable'
import { useAuth } from '../context/AuthContext'
import { computeRange, DateRangeValue, parseRangeFromParams, persistRangeToParams } from '../utils/dateRange'
import { formatMoney, formatNumber } from '../utils/format'
import { createSeeClient, formatSeeApiError } from '../api/seeClient'

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const normalizeTotals = (input: any): Record<string, number> => {
  if (!input || typeof input !== 'object') return {}
  return Object.keys(input).reduce<Record<string, number>>((acc, key) => {
    acc[key] = toNumber(input[key])
    return acc
  }, {})
}

export default function PublisherAnalyticsPage() {
  const auth = useAuth()
  const client = useMemo(() => createSeeClient({ getToken: () => auth.idToken }), [auth.idToken])
  const [searchParams, setSearchParams] = useSearchParams()
  const [range, setRange] = useState<DateRangeValue>(() => parseRangeFromParams(searchParams))
  const [overview, setOverview] = useState<any | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<'revenue' | 'views'>('revenue')

  const dateRangeParams = useMemo(() => computeRange(range), [range])
  const businessId = useMemo(() => {
    return (
      auth.primaryBusinessId ||
      auth.profile?.primaryBusinessId ||
      auth.profile?.businessId ||
      auth.profile?.business?.id ||
      null
    )
  }, [auth.primaryBusinessId, auth.profile])

  useEffect(() => {
    const params = persistRangeToParams(range, new URLSearchParams(searchParams))
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  useEffect(() => {
    const load = async () => {
      if (!auth.idToken) {
        setError('Sign in to view analytics.')
        return
      }
      if (!businessId) {
        setError('Select a business to view analytics.')
        setOverview(null)
        setEvents([])
        setVenues([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const { fromUtc, toUtc } = dateRangeParams
        const [overviewResp, eventResp, venueResp] = await Promise.all([
          client.fetchBusinessMetricsOverview({ businessId, fromUtc, toUtc }),
          client.fetchBusinessMetricsEvents({ businessId, fromUtc, toUtc, sort, take: 50 }),
          client.fetchBusinessMetricsVenues({ businessId, fromUtc, toUtc, sort: 'views', take: 50 })
        ])
        setOverview(overviewResp)
        setEvents(eventResp?.items || eventResp?.events || eventResp || [])
        setVenues(venueResp?.items || venueResp?.venues || venueResp || [])
      } catch (err) {
        const formatted = formatSeeApiError(err, 'Unable to load analytics.')
        setError(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [auth.idToken, businessId, dateRangeParams.fromUtc, dateRangeParams.toUtc, client, sort])

  const totals = normalizeTotals(overview?.totals || overview?.Totals)
  const series = Array.isArray(overview?.series || overview?.Series) ? (overview?.series || overview?.Series) : []
  const isEmpty = ['eventViews', 'checkoutStarted', 'paidOrders', 'ticketsIssued', 'ticketsValidated', 'grossRevenueCents']
    .every(key => (totals?.[key] ?? 0) === 0)

  const handleExport = () => {
    if (!events.length) return
    const headers = ['Event', 'Views', 'Paid Orders', 'Tickets Issued', 'Revenue']
    const rows = events.map((event: any) => [
      event.title || event.name || event.Name || 'Event',
      toNumber(event.views ?? event.eventViews),
      toNumber(event.paidOrders ?? event.orders),
      toNumber(event.ticketsIssued),
      toNumber(event.grossRevenueCents ?? event.revenueCents)
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'see-analytics.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <SiteNav
        activePath="/publisher/analytics"
        links={[
          { to: '/publisher', label: 'Dashboard' },
          { to: '/publisher/events', label: 'Events' },
          { to: '/publisher/analytics', label: 'Analytics' },
          { to: '/publisher/notifications', label: 'Notifications' }
        ]}
      />

      <div className="container" style={{ padding: '2.5rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>Publisher</p>
            <h1 style={{ margin: 0 }}>Business analytics</h1>
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>Views, orders, tickets, and revenue across your events.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleExport}>Download CSV</button>
            <Link to="/publisher/events/new" className="btn btn-primary">Create new event</Link>
          </div>
        </div>

        <DateRangePicker value={range} onChange={setRange} />

        {loading && <p style={{ color: 'var(--gray-600)' }}>Loading analytics…</p>}
        {error && <p style={{ color: 'var(--error-red)' }}>{error}</p>}

        {!loading && !error && isEmpty && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-body">
              <h3 className="card-title" style={{ marginTop: 0 }}>No activity yet</h3>
              <p style={{ color: 'var(--gray-600)', margin: 0 }}>
                Publish and share your events to see metrics here.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && !isEmpty && (
          <>
            <MetricsKpiRow
              items={[
                { label: 'Event Views', value: formatNumber(totals.eventViews || 0) },
                { label: 'Checkout Started', value: formatNumber(totals.checkoutStarted || 0) },
                { label: 'Paid Orders', value: formatNumber(totals.paidOrders || 0) },
                { label: 'Tickets Issued', value: formatNumber(totals.ticketsIssued || 0) },
                { label: 'Tickets Validated', value: formatNumber(totals.ticketsValidated || 0) },
                { label: 'Gross Revenue', value: formatMoney(totals.grossRevenueCents || 0) }
              ]}
            />

            <MetricsCharts
              charts={[
                {
                  title: 'Views by day',
                  data: series.map((s: any) => ({ date: s.date || s.day, value: toNumber(s.eventViews || s.views || 0) }))
                },
                {
                  title: 'Gross revenue by day',
                  data: series.map((s: any) => ({ date: s.date || s.day, value: toNumber(s.grossRevenueCents || 0) })),
                  valueFormatter: (value) => formatMoney(value || 0)
                },
                {
                  title: 'Paid orders by day',
                  data: series.map((s: any) => ({ date: s.date || s.day, value: toNumber(s.paidOrders || s.checkout_paid || 0) }))
                }
              ]}
            />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <span style={{ color: 'var(--gray-600)' }}>Sort top events by:</span>
              <button className={`chip ${sort === 'revenue' ? 'chip-active' : ''}`} onClick={() => setSort('revenue')}>Revenue</button>
              <button className={`chip ${sort === 'views' ? 'chip-active' : ''}`} onClick={() => setSort('views')}>Views</button>
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem', marginTop: '1rem' }}>
              <MetricsTable
                title="Top events"
                data={events}
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
                  { key: 'views', header: 'Views', render: (row: any) => formatNumber(toNumber(row.views || row.eventViews)) },
                  { key: 'orders', header: 'Paid orders', render: (row: any) => formatNumber(toNumber(row.paidOrders || row.orders)) },
                  { key: 'tickets', header: 'Tickets issued', render: (row: any) => formatNumber(toNumber(row.ticketsIssued)) },
                  { key: 'revenue', header: 'Gross revenue', render: (row: any) => formatMoney(toNumber(row.grossRevenueCents || row.revenueCents)) }
                ]}
                emptyMessage="No events yet."
              />
              <MetricsTable
                title="Top venues"
                data={venues}
                columns={[
                  {
                    key: 'name',
                    header: 'Venue',
                    render: (row: any) => row.name || row.title || row.Name || 'Venue'
                  },
                  { key: 'views', header: 'Views', render: (row: any) => formatNumber(toNumber(row.views || row.venueViews)) },
                  { key: 'orders', header: 'Paid orders', render: (row: any) => formatNumber(toNumber(row.paidOrders || row.orders)) },
                  { key: 'revenue', header: 'Gross revenue', render: (row: any) => formatMoney(toNumber(row.grossRevenueCents || row.revenueCents)) }
                ]}
                emptyMessage="No venues yet."
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
