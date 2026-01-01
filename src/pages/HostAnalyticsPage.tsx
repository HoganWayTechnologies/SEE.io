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

type EventMetricsRow = {
  id: string | null
  name: string
  views: number
  orders: number
  ticketsIssued: number
  ticketsValidated: number
  grossRevenueCents: number
  totals: Record<string, number>
  raw: any
}

type VenueMetricsRow = {
  id: string | null
  name: string
  views: number
  orders: number
  grossRevenueCents: number
  ticketsIssued: number
  ticketsValidated: number
  totals: Record<string, number>
  raw: any
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const normalizeTotals = (input: any): Record<string, number> => {
  if (!input || typeof input !== 'object') {
    return {}
  }
  return Object.keys(input).reduce<Record<string, number>>((acc, key) => {
    const normalizedKey = key.length > 0 ? key.charAt(0).toLowerCase() + key.slice(1) : key
    acc[normalizedKey] = toNumber((input as Record<string, unknown>)[key])
    return acc
  }, {})
}

const resolveId = (...candidates: unknown[]): string | null => {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue
    }
    const asString = String(candidate).trim()
    if (asString.length > 0) {
      return asString
    }
  }
  return null
}

const normalizeEventMetrics = (items: any[]): EventMetricsRow[] => {
  return items.map(item => {
    const totals = {
      ...normalizeTotals(item?.Totals),
      ...normalizeTotals(item?.totals)
    }

    const views = toNumber(item?.views ?? item?.eventViews ?? totals.eventViews)
    const orders = toNumber(
      item?.orders ??
      item?.paidOrders ??
      totals.checkoutPaid ??
      totals.paidOrders ??
      totals.orders
    )
    const ticketsIssued = toNumber(item?.ticketsIssued ?? totals.ticketsIssued)
    const ticketsValidated = toNumber(item?.ticketsValidated ?? totals.ticketsValidated)
    const grossRevenueCents = toNumber(
      item?.grossRevenueCents ??
      item?.revenueCents ??
      totals.grossRevenueCents ??
      totals.revenueCents
    )

    return {
      id: resolveId(item?.id, item?.eventId, item?.eventID, item?.Id, item?.EventId),
      name: item?.name ?? item?.title ?? item?.Name ?? 'Event',
      views,
      orders,
      ticketsIssued,
      ticketsValidated,
      grossRevenueCents,
      totals,
      raw: item
    }
  })
}

const normalizeVenueMetrics = (items: any[]): VenueMetricsRow[] => {
  return items.map(item => {
    const totals = {
      ...normalizeTotals(item?.Totals),
      ...normalizeTotals(item?.totals)
    }

    const views = toNumber(item?.views ?? totals.venueViews ?? totals.views)
    const orders = toNumber(
      item?.orders ??
      item?.paidOrders ??
      totals.checkoutPaid ??
      totals.paidOrders ??
      totals.orders
    )
    const grossRevenueCents = toNumber(
      item?.grossRevenueCents ??
      item?.revenueCents ??
      totals.grossRevenueCents ??
      totals.revenueCents
    )

    return {
      id: resolveId(item?.id, item?.venueId, item?.venueID, item?.Id, item?.VenueId),
      name: item?.name ?? item?.title ?? item?.Name ?? 'Venue',
      views,
      orders,
      grossRevenueCents,
      ticketsIssued: toNumber(item?.ticketsIssued ?? totals.ticketsIssued),
      ticketsValidated: toNumber(item?.ticketsValidated ?? totals.ticketsValidated),
      totals,
      raw: item
    }
  })
}

export default function HostAnalyticsPage() {
  const auth = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [range, setRange] = useState<DateRangeValue>(() => parseRangeFromParams(searchParams))
  const [overview, setOverview] = useState<any | null>(null)
  const [topEvents, setTopEvents] = useState<EventMetricsRow[]>([])
  const [topVenues, setTopVenues] = useState<VenueMetricsRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [showAllVenues, setShowAllVenues] = useState(false)

  const dateRangeParams = useMemo(() => computeRange(range), [range])
  const businessId = useMemo(() => {
    return (
      auth.primaryBusinessId ||
      auth.profile?.primaryBusinessId ||
      auth.profile?.businessId ||
      auth.profile?.business?.id ||
      auth.profile?.business?.businessId ||
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
        setTopEvents([])
        setTopVenues([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const { fromUtc, toUtc } = dateRangeParams
        const [overviewResp, eventsResp, venuesResp] = await Promise.all([
          api.fetchBusinessOverviewMetrics(auth.idToken, { businessId, fromUtc, toUtc }),
          api.fetchBusinessEventMetrics(auth.idToken, { businessId, fromUtc, toUtc, sort: 'revenue', take: 50 }),
          api.fetchBusinessVenueMetrics(auth.idToken, { businessId, fromUtc, toUtc, sort: 'views', take: 50 })
        ])
        setOverview(overviewResp)
        const eventsList = (eventsResp?.items || eventsResp?.events || eventsResp || []) as any[]
        const venuesList = (venuesResp?.items || venuesResp?.venues || venuesResp || []) as any[]
        setTopEvents(normalizeEventMetrics(eventsList))
        setTopVenues(normalizeVenueMetrics(venuesList))
      } catch (err: any) {
        setError(err?.message || 'Unable to load analytics.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [auth.idToken, businessId, dateRangeParams.fromUtc, dateRangeParams.toUtc])

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
          <Link to="/host/scan" className="btn btn-primary">Scan tickets</Link>
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
                  {
                    key: 'title',
                    header: 'Event',
                    render: (row: EventMetricsRow) => {
                      const eventId = row.id ?? row.raw?.eventId ?? row.raw?.id ?? row.raw?.Id ?? null
                      const label = row.name || row.raw?.name || row.raw?.title || 'Event'
                      return eventId ? <Link to={`/host/events/${eventId}/analytics`}>{label}</Link> : label
                    }
                  },
                  { key: 'views', header: 'Views', render: (row: EventMetricsRow) => formatNumber(row.views ?? row.raw?.eventViews ?? row.raw?.views ?? 0) },
                  { key: 'orders', header: 'Paid orders', render: (row: EventMetricsRow) => formatNumber(row.orders ?? 0) },
                  { key: 'tickets', header: 'Tickets issued', render: (row: EventMetricsRow) => formatNumber(row.ticketsIssued ?? 0) },
                  { key: 'validated', header: 'Tickets validated', render: (row: EventMetricsRow) => formatNumber(row.ticketsValidated ?? 0) },
                  { key: 'revenue', header: 'Gross revenue', render: (row: EventMetricsRow) => formatMoney(row.grossRevenueCents ?? 0) }
                ]}
                emptyMessage="No events yet."
              />
              <MetricsTable
                title="Top venues"
                data={venuesDisplay}
                columns={[
                  {
                    key: 'name',
                    header: 'Venue',
                    render: (row: VenueMetricsRow) => {
                      const venueId = row.id ?? row.raw?.venueId ?? row.raw?.id ?? row.raw?.Id ?? null
                      const label = row.name || row.raw?.name || 'Venue'
                      return venueId ? <Link to={`/host/venues/${venueId}/analytics`}>{label}</Link> : label
                    }
                  },
                  { key: 'views', header: 'Views', render: (row: VenueMetricsRow) => formatNumber(row.views ?? row.raw?.venueViews ?? row.raw?.views ?? 0) },
                  { key: 'orders', header: 'Paid orders', render: (row: VenueMetricsRow) => formatNumber(row.orders ?? 0) },
                  { key: 'ticketsValidated', header: 'Tickets validated', render: (row: VenueMetricsRow) => formatNumber(row.ticketsValidated ?? 0) },
                  { key: 'revenue', header: 'Gross revenue', render: (row: VenueMetricsRow) => formatMoney(row.grossRevenueCents ?? 0) }
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
