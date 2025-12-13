import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import DateRangePicker from '../components/DateRangePicker'
import { computeRange, DateRangeValue, parseRangeFromParams, persistRangeToParams } from '../utils/dateRange'
import KpiCard from '../components/KpiCard'
import LineChart from '../components/LineChart'
import { formatMoney, formatNumber } from '../utils/format'
import VenueAttributeChips from '../components/VenueAttributeChips'

export default function VenueAnalyticsPage() {
  const { venueId } = useParams()
  const auth = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [range, setRange] = useState<DateRangeValue>(() => parseRangeFromParams(searchParams))
  const [metrics, setMetrics] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [venue, setVenue] = useState<any | null>(null)

  const dateRangeParams = useMemo(() => computeRange(range), [range])

  useEffect(() => {
    const params = persistRangeToParams(range, new URLSearchParams(searchParams))
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  useEffect(() => {
    const loadVenue = async () => {
      if (!venueId) return
      try {
        const data = await api.fetchVenue(venueId)
        setVenue(data)
      } catch {
        // ignore
      }
    }
    loadVenue()
  }, [venueId])

  useEffect(() => {
    const load = async () => {
      if (!venueId || !auth.idToken) {
        setError('Sign in to view analytics.')
        return
      }
      setLoading(true)
      setError(null)
      try {
        const { fromUtc, toUtc } = dateRangeParams
        const resp = await api.fetchVenueMetrics(venueId, auth.idToken, { fromUtc, toUtc })
        setMetrics(resp)
      } catch (err: any) {
        setError(err?.message || 'Unable to load venue analytics.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [venueId, auth.idToken, dateRangeParams.fromUtc, dateRangeParams.toUtc])

  const totals = metrics?.totals || {}
  const series = Array.isArray(metrics?.series) ? metrics.series : []

  return (
    <div>
      <SiteNav activePath="/host/venues" />
      <div className="container" style={{ padding: '2rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>Venue</p>
            <h1 style={{ margin: 0 }}>{venue?.name || 'Venue analytics'}</h1>
            <p style={{ margin: 0, color: 'var(--gray-600)' }}>
              {[venue?.address, venue?.city, venue?.state].filter(Boolean).join(', ')}
            </p>
            {venue?.attributes && venue.attributes.length > 0 && (
              <div style={{ marginTop: '0.35rem' }}>
                <VenueAttributeChips attributes={venue.attributes} />
              </div>
            )}
          </div>
          <Link to={`/venues/${venueId}`} className="btn btn-secondary">View public page</Link>
        </div>

        <DateRangePicker value={range} onChange={setRange} />

        {loading && <p style={{ color: 'var(--gray-600)' }}>Loading analytics…</p>}
        {error && <p style={{ color: 'var(--error-red)' }}>{error}</p>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginTop: '0.5rem' }}>
              <KpiCard label="Venue Views" value={formatNumber(totals.views || totals.venueViews || 0)} />
              <KpiCard label="Tickets Issued" value={formatNumber(totals.ticketsIssued || 0)} />
              <KpiCard label="Gross Revenue" value={formatMoney(totals.grossRevenueCents || totals.revenueCents || 0)} />
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem', marginTop: '1rem' }}>
              <LineChart
                title="Venue views by day"
                data={series.map((s: any) => ({ date: s.date || s.day, value: s.views || s.venueViews || 0 }))}
              />
              <LineChart
                title="Revenue by day"
                data={series.map((s: any) => ({ date: s.date || s.day, value: s.grossRevenueCents || s.revenueCents || 0 }))}
                valueFormatter={(v) => formatMoney(v || 0)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
