import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import DateRangePicker from '../components/DateRangePicker'
import { computeRange, DateRangeValue, parseRangeFromParams, persistRangeToParams } from '../utils/dateRange'
import KpiCard from '../components/KpiCard'
import LineChart from '../components/LineChart'
import MetricsTable from '../components/MetricsTable'
import { formatMoney, formatNumber } from '../utils/format'

export default function HostAnalyticsPage() {
  const auth = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [range, setRange] = useState<DateRangeValue>(() => parseRangeFromParams(searchParams))
  const [overview, setOverview] = useState<any | null>(null)
  const [topEvents, setTopEvents] = useState<any[]>([])
  const [topVenues, setTopVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [showAllVenues, setShowAllVenues] = useState(false)

  const dateRangeParams = useMemo(() => computeRange(range), [range])

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
      setLoading(true)
      setError(null)
      try {
        const { fromUtc, toUtc } = dateRangeParams
        const [overviewResp, eventsResp, venuesResp] = await Promise.all([
          api.fetchBusinessOverviewMetrics(auth.idToken, { fromUtc, toUtc }),
          api.fetchBusinessEventMetrics(auth.idToken, { fromUtc, toUtc, sort: 'revenue', take: 50 }),
          api.fetchBusinessVenueMetrics(auth.idToken, { fromUtc, toUtc, sort: 'views', take: 50 })
        ])
        setOverview(overviewResp)
        const eventsList = (eventsResp?.items || eventsResp?.events || eventsResp || []) as any[]
        const venuesList = (venuesResp?.items || venuesResp?.venues || venuesResp || []) as any[]
        setTopEvents(eventsList)
        setTopVenues(venuesList)
      } catch (err: any) {
        setError(err?.message || 'Unable to load analytics.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [auth.idToken, dateRangeParams.fromUtc, dateRangeParams.toUtc])

  const totals = overview?.totals || {}
  const series = Array.isArray(overview?.series) ? overview.series : []
  const isEmpty = ['eventViews', 'checkoutStarted', 'paidOrders', 'ticketsIssued', 'ticketsValidated', 'grossRevenueCents']
    .every(key => (totals?.[key] ?? 0) === 0)

  const eventsDisplay = showAllEvents ? topEvents : topEvents.slice(0, 10)
  const venuesDisplay = showAllVenues ? topVenues : topVenues.slice(0, 10)

  return (
    <div>
      <SiteNav activePath="/host/analytics" />
      <div className="container" style={{ padding: '2rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>Host</p>
            <h1 style={{ margin: 0 }}>Business Analytics</h1>
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>Proof of value: views, orders, tickets, and revenue.</p>
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
                Publish an event, share it, and you’ll see metrics here.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && !isEmpty && (
          <>
            <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginTop: '1rem' }}>
              <KpiCard label="Event Views" value={formatNumber(totals.eventViews || 0)} />
              <KpiCard label="Checkout Started" value={formatNumber(totals.checkoutStarted || 0)} />
              <KpiCard label="Paid Orders" value={formatNumber(totals.paidOrders || 0)} />
              <KpiCard label="Tickets Issued" value={formatNumber(totals.ticketsIssued || 0)} />
              <KpiCard label="Tickets Validated" value={formatNumber(totals.ticketsValidated || 0)} />
              <KpiCard label="Gross Revenue" value={formatMoney(totals.grossRevenueCents || 0)} />
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem', marginTop: '1rem' }}>
              <LineChart
                title="Views by day"
                data={series.map((s: any) => ({ date: s.date || s.day, value: s.eventViews || s.views || 0 }))}
              />
              <LineChart
                title="Gross revenue by day"
                data={series.map((s: any) => ({ date: s.date || s.day, value: s.grossRevenueCents || 0 }))}
                valueFormatter={(v) => formatMoney(v || 0)}
              />
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem', marginTop: '1rem' }}>
              <MetricsTable
                title="Top events"
                data={eventsDisplay}
                columns={[
                  { key: 'title', header: 'Event', render: (row: any) => <Link to={`/host/events/${row.eventId || row.id}/analytics`}>{row.title || row.name || 'Event'}</Link> },
                  { key: 'views', header: 'Views', render: (row: any) => formatNumber(row.views || row.eventViews || 0) },
                  { key: 'orders', header: 'Paid orders', render: (row: any) => formatNumber(row.paidOrders || row.orders || 0) },
                  { key: 'tickets', header: 'Tickets issued', render: (row: any) => formatNumber(row.ticketsIssued || 0) },
                  { key: 'revenue', header: 'Gross revenue', render: (row: any) => formatMoney(row.grossRevenueCents || row.revenueCents || 0) }
                ]}
                emptyMessage="No events yet."
              />
              <MetricsTable
                title="Top venues"
                data={venuesDisplay}
                columns={[
                  { key: 'name', header: 'Venue', render: (row: any) => <Link to={`/host/venues/${row.venueId || row.id}/analytics`}>{row.name || 'Venue'}</Link> },
                  { key: 'views', header: 'Views', render: (row: any) => formatNumber(row.views || row.venueViews || 0) },
                  { key: 'orders', header: 'Paid orders', render: (row: any) => formatNumber(row.paidOrders || row.orders || 0) },
                  { key: 'revenue', header: 'Gross revenue', render: (row: any) => formatMoney(row.grossRevenueCents || row.revenueCents || 0) }
                ]}
                emptyMessage="No venues yet."
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {topEvents.length > 10 && (
                <button className="btn btn-secondary" onClick={() => setShowAllEvents(s => !s)}>
                  {showAllEvents ? 'Show top 10 events' : 'View all events'}
                </button>
              )}
              {topVenues.length > 10 && (
                <button className="btn btn-secondary" onClick={() => setShowAllVenues(s => !s)}>
                  {showAllVenues ? 'Show top 10 venues' : 'View all venues'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
