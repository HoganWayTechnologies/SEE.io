import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import { api, formatEventForDisplay, seeApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import DateRangePicker from '../components/DateRangePicker'
import { computeRange, DateRangeValue, parseRangeFromParams, persistRangeToParams } from '../utils/dateRange'
import KpiCard from '../components/KpiCard'
import LineChart from '../components/LineChart'
import MetricsTable from '../components/MetricsTable'
import { formatMoney, formatNumber } from '../utils/format'

export default function EventAnalyticsPage() {
  const { eventId } = useParams()
  const auth = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [range, setRange] = useState<DateRangeValue>(() => parseRangeFromParams(searchParams))
  const [metrics, setMetrics] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventInfo, setEventInfo] = useState<any | null>(null)

  const dateRangeParams = useMemo(() => computeRange(range), [range])

  useEffect(() => {
    const params = persistRangeToParams(range, new URLSearchParams(searchParams))
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  useEffect(() => {
    const loadInfo = async () => {
      if (!eventId) return
      try {
        const data = await seeApi.getEvent(eventId)
        setEventInfo(formatEventForDisplay(data))
      } catch {
        // ignore
      }
    }
    loadInfo()
  }, [eventId])

  useEffect(() => {
    const load = async () => {
      if (!eventId || !auth.idToken) {
        setError('Sign in to view analytics.')
        return
      }
      setLoading(true)
      setError(null)
      try {
        const { fromUtc, toUtc } = dateRangeParams
        const resp = await api.fetchEventMetrics(eventId, auth.idToken, { fromUtc, toUtc })
        setMetrics(resp)
      } catch (err: any) {
        setError(err?.message || 'Unable to load event analytics.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [eventId, auth.idToken, dateRangeParams.fromUtc, dateRangeParams.toUtc])

  const totals = metrics?.totals || {}
  const series = Array.isArray(metrics?.series) ? metrics.series : []
  const funnel = [
    { label: 'Views', value: totals.views || totals.eventViews || 0 },
    { label: 'Checkout Started', value: totals.checkoutStarted || totals.click_get_tickets || totals.checkout_created || 0 },
    { label: 'Paid Orders', value: totals.checkout_paid || totals.paidOrders || 0 },
    { label: 'Tickets Issued', value: totals.ticketsIssued || 0 },
    { label: 'Validated', value: totals.validated || totals.ticketsValidated || 0 }
  ]

  const scanFailures = metrics?.scanFailures || metrics?.validationFailures || []

  return (
    <div>
      <SiteNav activePath="/host/events" />
      <div className="container" style={{ padding: '2rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>Event</p>
            <h1 style={{ margin: 0 }}>{eventInfo?.title || 'Event analytics'}</h1>
            <p style={{ margin: 0, color: 'var(--gray-600)' }}>
              {eventInfo?.date} {eventInfo?.time}
            </p>
          </div>
          <Link to={`/event/${eventId}`} className="btn btn-secondary">View public page</Link>
        </div>

        <DateRangePicker value={range} onChange={setRange} />

        {loading && <p style={{ color: 'var(--gray-600)' }}>Loading analytics…</p>}
        {error && <p style={{ color: 'var(--error-red)' }}>{error}</p>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginTop: '0.5rem' }}>
              <KpiCard label="Views" value={formatNumber(totals.views || totals.eventViews || 0)} />
              <KpiCard label="Checkout Started" value={formatNumber(totals.checkoutStarted || totals.click_get_tickets || totals.checkout_created || 0)} />
              <KpiCard label="Paid Orders" value={formatNumber(totals.checkout_paid || totals.paidOrders || 0)} />
              <KpiCard label="Tickets Issued" value={formatNumber(totals.ticketsIssued || 0)} />
              <KpiCard label="Validated" value={formatNumber(totals.validated || totals.ticketsValidated || 0)} />
              <KpiCard label="Gross Revenue" value={formatMoney(totals.grossRevenueCents || totals.revenueCents || 0)} />
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-body">
                <p className="card-title" style={{ marginTop: 0 }}>Funnel</p>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {funnel.map(step => (
                    <div key={step.label} style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid var(--gray-200)', borderRadius: '0.5rem', padding: '0.6rem 0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>{step.label}</span>
                      <span>{formatNumber(step.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3" style={{ gap: '1rem', marginTop: '1rem' }}>
              <LineChart
                title="Views by day"
                data={series.map((s: any) => ({ date: s.date || s.day, value: s.views || s.eventViews || 0 }))}
              />
              <LineChart
                title="Paid orders by day"
                data={series.map((s: any) => ({ date: s.date || s.day, value: s.checkout_paid || s.paidOrders || 0 }))}
              />
              <LineChart
                title="Validated tickets by day"
                data={series.map((s: any) => ({ date: s.date || s.day, value: s.validated || s.ticketsValidated || 0 }))}
              />
            </div>

            {scanFailures && Array.isArray(scanFailures) && scanFailures.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <MetricsTable
                  title="Scan failures"
                  data={scanFailures}
                  columns={[
                    { key: 'reason', header: 'Reason', render: (row: any) => row.reason || row.label || 'Unknown' },
                    { key: 'count', header: 'Count', render: (row: any) => formatNumber(row.count || row.value || 0) }
                  ]}
                  emptyMessage="No failures"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
