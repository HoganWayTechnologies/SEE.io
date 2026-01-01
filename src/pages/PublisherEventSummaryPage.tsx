import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import SummaryReportCard from '../components/SummaryReportCard'
import ShareModal from '../components/ShareModal'
import { useAuth } from '../context/AuthContext'
import { createSeeClient, formatSeeApiError, PostEventSummaryResponse } from '../api/seeClient'

export default function PublisherEventSummaryPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const client = useMemo(() => createSeeClient({ getToken: () => auth.idToken }), [auth.idToken])
  const [summary, setSummary] = useState<PostEventSummaryResponse | null>(null)
  const [status, setStatus] = useState<string | null>('Loading summary…')
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
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
    const load = async () => {
      if (!eventId) return
      setStatus('Loading summary…')
      try {
        const resp = await client.fetchPostEventSummary(eventId)
        setSummary(resp)
        setStatus(null)
      } catch (err) {
        const formatted = formatSeeApiError(err, 'Unable to load summary.')
        setStatus(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
      }
    }
    load()
  }, [client, eventId])

  const handleClone = async () => {
    if (!eventId) return
    setStatus('Cloning event…')
    try {
      const resp = await client.clonePublisherEvent(eventId, { businessId: businessId || undefined })
      const newId = resp?.id || resp?.eventId || resp?.event?.id
      if (newId) {
        navigate(`/publisher/events/${newId}?cloned=1`)
        return
      }
      setStatus('Event cloned, but no id was returned.')
    } catch (err) {
      const formatted = formatSeeApiError(err, 'Clone failed.')
      setStatus(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
    }
  }

  const handleShare = async () => {
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
      <div className="container" style={{ padding: '2.5rem 0', maxWidth: '900px' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>Post-event summary</h1>
          <p style={{ color: 'var(--gray-600)' }}>Review results and clone for next time.</p>
        </header>

        {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
        {!status && summary && (
          <SummaryReportCard
            title="Your event wrap-up"
            summary={{
              totals: summary.totals,
              highlights: summary.highlights,
              recommendations: summary.recommendations,
              summary: summary.summary
            }}
            onClone={handleClone}
            onShare={handleShare}
          />
        )}

        <div style={{ marginTop: '1rem' }}>
          <Link to={`/publisher/events/${eventId}`} className="btn btn-secondary">Back to event</Link>
        </div>
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
