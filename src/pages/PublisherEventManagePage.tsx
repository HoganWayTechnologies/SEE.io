import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import Footer from '../components/Footer'
import Seo from '../components/Seo'
import { api, Event, formatEventForDisplay, seeApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function PublisherEventManagePage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

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

  const loadEvent = useCallback(async () => {
    if (!eventId || !auth.idToken) {
      setError('Event not found.')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      let eventData: any | null = null

      try {
        const resp = await api.fetchPublisherEventsAuthorized(auth.idToken, {
          businessId: businessId || undefined,
          search: eventId,
          pageSize: 50
        })
        const collection = Array.isArray(resp?.items) ? resp.items : Array.isArray(resp) ? resp : []
        eventData = collection.find((item: any) => (item?.id || item?.Id || item?.eventId) === eventId) || null
      } catch (err) {
        console.debug('Publisher event lookup failed, falling back to public event load', err)
      }

      if (!eventData) {
        eventData = await seeApi.getEvent(eventId)
      }

      setEvent(formatEventForDisplay(eventData))
    } catch (err: any) {
      console.error('Unable to load event', err)
      setError(err?.message || 'Unable to load event details right now.')
    } finally {
      setLoading(false)
    }
  }, [eventId, auth.idToken, businessId])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  const handlePublish = async () => {
    if (!eventId || !auth.idToken) return
    setPublishing(true)
    setStatusMessage('Publishing event...')
    try {
      await api.publishPublisherEvent(eventId, auth.idToken, businessId || undefined)
      setStatusMessage('Event published! Attendees can now see the latest version.')
      await loadEvent()
    } catch (err: any) {
      setStatusMessage(err?.message || 'Publish failed. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  const handleCancel = async () => {
    if (!eventId || !auth.idToken) return
    if (!window.confirm('Cancel this event? Attendees will see it as canceled.')) return
    setCancelling(true)
    setStatusMessage('Canceling event...')
    try {
      await api.cancelPublisherEvent(eventId, auth.idToken, businessId || undefined)
      setStatusMessage('Event canceled. You can refresh to confirm status.')
      await loadEvent()
    } catch (err: any) {
      setStatusMessage(err?.message || 'Cancel failed. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const handleBack = () => navigate('/my-events')

  const bannerUrl = event?.heroImageUrl || event?.image || null
  const pageTitle = event ? `Manage ${event.title}` : 'Manage Event'

  return (
    <div>
      <Seo title={pageTitle} description="Manage event publishing, tickets, and pages." />
      <SiteNav />
      <main className="container" style={{ padding: '2rem 0 4rem' }}>
        <button type="button" className="nav-link" onClick={handleBack} style={{ marginBottom: '1.5rem' }}>
          ← Back to My Events
        </button>

        {loading && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <strong>Loading event info…</strong>
          </div>
        )}

        {!loading && error && (
          <div className="card" style={{ padding: '2rem', borderColor: 'var(--danger-500)', color: 'var(--danger-600)' }}>
            <h2 style={{ marginTop: 0 }}>Unable to load event</h2>
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={loadEvent}>Try again</button>
          </div>
        )}

        {!loading && !error && event && (
          <div style={{ display: 'grid', gap: '2rem' }}>
            <section className="card" style={{ overflow: 'hidden' }}>
              {bannerUrl && (
                <img src={bannerUrl} alt="Event hero" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover' }} />
              )}
              <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
                <span className="chip chip-active" style={{ width: 'fit-content' }}>{event.status || 'draft'}</span>
                <h1 style={{ margin: 0 }}>{event.title}</h1>
                <div style={{ color: 'var(--gray-700)' }}>
                  <div>{event.date} {event.time && `at ${event.time}`}</div>
                  <div>{event.location}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <Link className="nav-link" to={`/event/${event.id}`} target="_blank" rel="noopener noreferrer">
                    View public page
                  </Link>
                  <Link className="nav-link" to={`/publisher/events/${event.id}/edit`}>
                    Edit details
                  </Link>
                  <Link className="nav-link" to={`/publisher/events/${event.id}/page`}>
                    Page builder
                  </Link>
                  <Link className="nav-link" to={`/host/events/${event.id}/tickets`}>
                    Ticket manager
                  </Link>
                  <Link className="nav-link" to={`/host/events/${event.id}/analytics`}>
                    Event analytics
                  </Link>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
                <h2 style={{ margin: 0 }}>Actions</h2>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" disabled={publishing} onClick={handlePublish}>
                    {publishing ? 'Publishing…' : 'Publish updates'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/publisher/events/${event.id}/edit`)}>
                    Edit details
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/publisher/events/${event.id}/page`)}>
                    Edit page layout
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/host/events/${event.id}/tickets`)}>
                    Edit tickets
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/host/events/${event.id}/analytics`)}>
                    View analytics
                  </button>
                  <button className="btn" style={{ backgroundColor: 'var(--danger-100)', color: 'var(--danger-700)' }} onClick={handleCancel} disabled={cancelling}>
                    {cancelling ? 'Canceling…' : 'Cancel event'}
                  </button>
                </div>
                {statusMessage && <p style={{ margin: 0, color: 'var(--gray-700)' }}>{statusMessage}</p>}
              </div>
            </section>

            <section className="card">
              <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
                <h2 style={{ margin: 0 }}>Event description</h2>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--gray-700)' }}>
                  {event.description || 'No description provided yet.'}
                </p>
              </div>
            </section>

            <section className="card">
              <div className="card-body" style={{ display: 'grid', gap: '0.5rem' }}>
                <h2 style={{ margin: 0 }}>Details</h2>
                <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <Detail label="Admission" value={event.admissionType} />
                  <Detail label="Timezone" value={event.timezone} />
                  <Detail label="Venue" value={event.venueName} />
                  <Detail label="Address" value={event.venueAddress} />
                  <Detail label="Hosted by" value={event.businessName || event.organizer} />
                </dl>
                {Array.isArray(event.tags) && event.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {event.tags.map(tag => (
                      <span key={tag} className="chip">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>{label}</dt>
      <dd style={{ margin: 0, color: 'var(--gray-800)', fontWeight: 600 }}>{value}</dd>
    </div>
  )
}
