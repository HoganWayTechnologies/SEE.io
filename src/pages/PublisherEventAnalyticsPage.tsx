import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import DateRangePicker from '../components/DateRangePicker'
import MetricsKpiRow from '../components/MetricsKpiRow'
import MetricsCharts from '../components/MetricsCharts'
import MetricsTable from '../components/MetricsTable'
import ShareModal from '../components/ShareModal'
import { useAuth } from '../context/AuthContext'
import { computeRange, DateRangeValue, parseRangeFromParams, persistRangeToParams } from '../utils/dateRange'
import { formatMoney, formatNumber } from '../utils/format'
import { createSeeClient, formatSeeApiError } from '../api/seeClient'
import { formatEventForDisplay, seeApi } from '../services/api'

export default function PublisherEventAnalyticsPage() {
  const { eventId } = useParams()
  const auth = useAuth()
  const client = useMemo(() => createSeeClient({ getToken: () => auth.idToken }), [auth.idToken])
  const [searchParams, setSearchParams] = useSearchParams()
  const [range, setRange] = useState<DateRangeValue>(() => parseRangeFromParams(searchParams))
  const [metrics, setMetrics] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventInfo, setEventInfo] = useState<any | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

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
        const resp = await client.fetchEventMetrics(eventId, { fromUtc, toUtc })
        setMetrics(resp)
      } catch (err) {
        const formatted = formatSeeApiError(err, 'Unable to load event analytics.')
        setError(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [eventId, auth.idToken, dateRangeParams.fromUtc, dateRangeParams.toUtc, client])

  const totals = metrics?.totals || metrics?.Totals || {}
  const series = Array.isArray(metrics?.series || metrics?.Series) ? (metrics?.series || metrics?.Series) : []
  const scanFailures = metrics?.scanFailures || metrics?.validationFailures || []

  const handleOpenShare = async () => {
    if (!eventId) return
    try {
      const resp = await client.fetchShareLink(eventId)
      const resolved = resp?.publicUrl || resp?.url || resp?.shareUrl || resp?.link || null
      setShareUrl(resolved)
      setShareOpen(true)
    } catch {
      setShareUrl(`/event/${eventId}`)
      setShareOpen(true)
    }
  }

  return (
    <div>
      <SiteNav
        activePath="/publisher/events"
        links={[
          { to: '/publisher', label: 'Dashboard' },
          { to: '/publisher/events', label: 'Events' },
          { to: '/publisher/analytics', label: 'Analytics' }
        ]}
      />
      <div className="container" style={{ padding: '2rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>Event</p>
            <h1 style={{ margin: 0 }}>{eventInfo?.title || 'Event analytics'}</h1>
            <p style={{ margin: 0, color: 'var(--gray-600)' }}>{eventInfo?.date} {eventInfo?.time}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to={`/publisher/events/${eventId}`} className="btn btn-secondary">Back to event</Link>
            <button className="btn btn-primary" onClick={handleOpenShare}>Share this event</button>
          </div>
        </div>

        <DateRangePicker value={range} onChange={setRange} />

        {loading && <p style={{ color: 'var(--gray-600)' }}>Loading analytics…</p>}
        {error && <p style={{ color: 'var(--error-red)' }}>{error}</p>}

        {!loading && !error && (
          <>
            <MetricsKpiRow
              items={[
                { label: 'Views', value: formatNumber(totals.views || totals.eventViews || 0) },
                { label: 'Checkout Started', value: formatNumber(totals.checkoutStarted || totals.click_get_tickets || totals.checkout_created || 0) },
                { label: 'Paid Orders', value: formatNumber(totals.checkout_paid || totals.paidOrders || 0) },
                { label: 'Tickets Issued', value: formatNumber(totals.ticketsIssued || 0) },
                { label: 'Validated', value: formatNumber(totals.validated || totals.ticketsValidated || 0) },
                { label: 'Gross Revenue', value: formatMoney(totals.grossRevenueCents || totals.revenueCents || 0) },
                { label: 'Refunds', value: formatNumber(totals.refunds || totals.refundCount || 0) },
                { label: 'Refund Amount', value: formatMoney(totals.refundAmountCents || totals.refundsAmountCents || 0) }
              ]}
            />

            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-body">
                <p className="card-title" style={{ marginTop: 0 }}>Engagement funnel</p>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {[
                    { label: 'Views', value: totals.views || totals.eventViews || 0 },
                    { label: 'Ticket clicks', value: totals.ticketClicks || totals.checkoutStarted || 0 },
                    { label: 'Paid orders', value: totals.checkout_paid || totals.paidOrders || 0 },
                    { label: 'Tickets issued', value: totals.ticketsIssued || 0 }
                  ].map(step => (
                    <div key={step.label} style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid var(--gray-200)', borderRadius: '0.5rem', padding: '0.6rem 0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>{step.label}</span>
                      <span>{formatNumber(step.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <MetricsCharts
              charts={[
                { title: 'Views by day', data: series.map((s: any) => ({ date: s.date || s.day, value: s.views || s.eventViews || 0 })) },
                { title: 'Paid orders by day', data: series.map((s: any) => ({ date: s.date || s.day, value: s.checkout_paid || s.paidOrders || 0 })) },
                { title: 'Validated tickets by day', data: series.map((s: any) => ({ date: s.date || s.day, value: s.validated || s.ticketsValidated || 0 })) }
              ]}
            />

            {scanFailures && Array.isArray(scanFailures) && scanFailures.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <MetricsTable
                  title="Validation failures"
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

      <ShareModal
        open={shareOpen}
        baseUrl={shareUrl}
        onClose={() => setShareOpen(false)}
        onShare={(channel, url) => {
          if (!eventId) return
          client.trackShareClick(eventId, { channel, url }).catch(() => {})
        }}
      />
    </div>
  )
}
