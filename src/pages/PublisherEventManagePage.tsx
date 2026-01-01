import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import Footer from '../components/Footer'
import Seo from '../components/Seo'
import { api, Event, formatEventForDisplay, seeApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import SuccessPanelCard from '../components/SuccessPanelCard'
import ShareModal from '../components/ShareModal'
import { createSeeClient, formatSeeApiError, PostPublishResponse } from '../api/seeClient'

export default function PublisherEventManagePage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const client = useMemo(() => createSeeClient({ getToken: () => auth.idToken }), [auth.idToken])
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)
  const [rawEvent, setRawEvent] = useState<any | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [postPublish, setPostPublish] = useState<PostPublishResponse | null>(null)
  const [postPublishStatus, setPostPublishStatus] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [summaryReady, setSummaryReady] = useState(false)
  const [draftFields, setDraftFields] = useState({
    tags: '',
    description: '',
    admissionType: 'open',
    externalTicketUrl: ''
  })
  const [draftAutosaveStatus, setDraftAutosaveStatus] = useState<string | null>(null)
  const [showDraftEditor, setShowDraftEditor] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement | null>(null)
  const draftHydratedRef = useRef(false)
  const draftAutosaveRef = useRef<number | null>(null)

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
        const resp = await client.listPublisherEvents({
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

      setRawEvent(eventData)
      setEvent(formatEventForDisplay(eventData))
    } catch (err: any) {
      console.error('Unable to load event', err)
      const formatted = formatSeeApiError(err, 'Unable to load event details right now.')
      setError(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
    } finally {
      setLoading(false)
    }
  }, [eventId, auth.idToken, businessId, client])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  const shouldShowSuccess = useMemo(() => {
    const publishedParam = searchParams.get('published')
    const statusValue = (event?.status || '').toLowerCase()
    return publishedParam === '1' || statusValue === 'active'
  }, [searchParams, event?.status])

  const isDraftFlow = useMemo(() => {
    const statusValue = (event?.status || '').toLowerCase()
    if (statusValue === 'active') return false
    return statusValue.includes('draft') || searchParams.get('draft') === '1' || searchParams.get('cloned') === '1'
  }, [event?.status, searchParams])

  const draftBanner = useMemo(() => {
    if (!isDraftFlow) return null
    if (searchParams.get('draft') === '1') return 'Draft created. Finish the checklist below to publish.'
    if (searchParams.get('cloned') === '1') return 'Event cloned. Update the date/time, then publish.'
    return null
  }, [isDraftFlow, searchParams])

  useEffect(() => {
    const loadPostPublish = async () => {
      if (!eventId || !auth.idToken || !shouldShowSuccess) return
      setPostPublishStatus('Loading success panel…')
      try {
        const resp = await client.fetchPostPublish(eventId)
        setPostPublish(resp)
        setPostPublishStatus(null)
      } catch (err) {
        const formatted = formatSeeApiError(err, 'Unable to load success panel.')
        setPostPublishStatus(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
      }
    }
    loadPostPublish()
  }, [auth.idToken, client, eventId, shouldShowSuccess])

  useEffect(() => {
    const checkSummary = async () => {
      if (!eventId || !auth.idToken || !rawEvent?.endUtc) return
      const end = new Date(rawEvent.endUtc)
      if (Number.isNaN(end.getTime()) || end.getTime() > Date.now()) return
      try {
        await client.fetchPostEventSummary(eventId)
        setSummaryReady(true)
      } catch {
        setSummaryReady(false)
      }
    }
    checkSummary()
  }, [auth.idToken, client, eventId, rawEvent?.endUtc])

  useEffect(() => {
    if (!rawEvent) return
    const tags = Array.isArray(rawEvent.tags)
      ? rawEvent.tags.join(', ')
      : typeof rawEvent.tags === 'string'
        ? rawEvent.tags
        : ''
    setDraftFields({
      tags,
      description: rawEvent.description || rawEvent.Description || '',
      admissionType: rawEvent.admissionType || rawEvent.AdmissionType || 'open',
      externalTicketUrl: rawEvent.externalTicketUrl || rawEvent.ExternalTicketUrl || ''
    })
    draftHydratedRef.current = true
  }, [rawEvent])

  useEffect(() => {
    if (!eventId || !isDraftFlow || !draftHydratedRef.current) return
    if (draftAutosaveRef.current) window.clearTimeout(draftAutosaveRef.current)
    draftAutosaveRef.current = window.setTimeout(async () => {
      setDraftAutosaveStatus('Saving…')
      try {
        const payload = {
          description: draftFields.description.trim() || undefined,
          tags: draftFields.tags
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean),
          admissionType: draftFields.admissionType || undefined,
          externalTicketUrl: draftFields.externalTicketUrl.trim() || undefined
        }
        await client.updatePublisherEvent(eventId, payload, { businessId: businessId || undefined })
        setDraftAutosaveStatus(`Saved ${new Date().toLocaleTimeString()}`)
      } catch (err) {
        const formatted = formatSeeApiError(err, 'Autosave failed.')
        setDraftAutosaveStatus(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
      }
    }, 1200)
    return () => {
      if (draftAutosaveRef.current) window.clearTimeout(draftAutosaveRef.current)
    }
  }, [businessId, client, draftFields, eventId, isDraftFlow])

  const handlePublish = async () => {
    if (!eventId || !auth.idToken) return
    setPublishing(true)
    setStatusMessage('Publishing event...')
    try {
      await client.publishPublisherEvent(eventId, { businessId: businessId || undefined })
      setStatusMessage('Event published! Attendees can now see the latest version.')
      await loadEvent()
    } catch (err: any) {
      const formatted = formatSeeApiError(err, 'Publish failed. Please try again.')
      setStatusMessage(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
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
      await client.cancelPublisherEvent(eventId, { businessId: businessId || undefined })
      setStatusMessage('Event canceled. You can refresh to confirm status.')
      await loadEvent()
    } catch (err: any) {
      const formatted = formatSeeApiError(err, 'Cancel failed. Please try again.')
      setStatusMessage(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
    } finally {
      setCancelling(false)
    }
  }

  const updateDraftField = (key: keyof typeof draftFields, value: string) => {
    setDraftFields(prev => ({ ...prev, [key]: value }))
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

  const handleNextBestAction = () => {
    const action = postPublish?.nextBestAction?.action
    if (!action) return
    if (action === 'add_banner') {
      bannerInputRef.current?.click()
      return
    }
    if (action === 'add_tickets') {
      navigate(`/host/events/${eventId}/tickets`)
      return
    }
    if (action === 'enable_rsvp') {
      navigate(`/publisher/events/${eventId}/edit`)
      return
    }
    if (action === 'share_link') {
      handleShare()
    }
  }

  const handleBannerUpload = async (file: File | null) => {
    if (!file || !eventId || !auth.idToken) return
    setStatusMessage('Uploading banner…')
    try {
      const result = await api.uploadEventImage(eventId, file, 'hero', auth.idToken, businessId || undefined)
      if (result?.resolvedUrl) {
        await client.updatePublisherEvent(eventId, { imageUrl: result.resolvedUrl }, { businessId: businessId || undefined })
      }
      setStatusMessage('Banner uploaded.')
    } catch (err) {
      const formatted = formatSeeApiError(err, 'Banner upload failed.')
      setStatusMessage(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
    }
  }

  const bannerUrl = event?.heroImageUrl || event?.image || null
  const pageTitle = event ? `Manage ${event.title}` : 'Manage Event'

  return (
    <div>
      <Seo title={pageTitle} description="Manage event publishing, tickets, and pages." />
      <SiteNav />
      <main className="container" style={{ padding: '2rem 0 4rem' }}>
        <button type="button" className="nav-link" onClick={() => navigate('/publisher/events')} style={{ marginBottom: '1.5rem' }}>
          ← Back to Events
        </button>

        {draftBanner && (
          <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--primary-blue)' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <strong>{draftBanner}</strong>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--gray-600)' }}>We will autosave your updates.</p>
              </div>
              <button className="btn btn-primary" onClick={handlePublish}>Publish now</button>
            </div>
          </div>
        )}

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
                  <Link className="nav-link" to={`/publisher/events/${event.id}/analytics`}>
                    Event analytics
                  </Link>
                  {summaryReady && (
                    <Link className="nav-link" to={`/publisher/events/${event.id}/summary`}>
                      Post-event summary
                    </Link>
                  )}
                </div>
              </div>
            </section>

            {isDraftFlow && (
              <section className="card">
                <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Make it real</h2>
                    <p style={{ color: 'var(--gray-600)' }}>
                      Finish the essentials, then publish when you are ready.
                    </p>
                  </div>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => bannerInputRef.current?.click()}>
                      Add banner image
                    </button>
                    <Link className="btn btn-secondary" to={`/host/events/${event.id}/tickets`}>
                      Add tickets or enable RSVP
                    </Link>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowDraftEditor(open => !open)}>
                      Add tags or full description
                    </button>
                    <a className="btn btn-secondary" href={`/event/${event.id}`} target="_blank" rel="noopener noreferrer">
                      Preview public page
                    </a>
                  </div>
                  <button type="button" className="nav-link" onClick={() => setShowDraftEditor(open => !open)}>
                    {showDraftEditor ? 'Hide Advanced Editor' : 'Switch to Advanced Editor'}
                  </button>
                  {showDraftEditor && (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <div>
                        <label className="form-label">Tags</label>
                        <input
                          className="form-input"
                          value={draftFields.tags}
                          onChange={(e) => updateDraftField('tags', e.target.value)}
                          placeholder="Comma separated"
                        />
                      </div>
                      <div>
                        <label className="form-label">Full description</label>
                        <textarea
                          className="form-input"
                          rows={4}
                          value={draftFields.description}
                          onChange={(e) => updateDraftField('description', e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <label className="form-label">Admission type</label>
                          <select
                            className="form-input"
                            value={draftFields.admissionType}
                            onChange={(e) => updateDraftField('admissionType', e.target.value)}
                          >
                            <option value="open">Open / RSVP</option>
                            <option value="free">Free</option>
                            <option value="see_ticketed">SEE Ticketed</option>
                            <option value="external_ticketed">External Ticketed</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="form-label">External ticket URL</label>
                          <input
                            className="form-input"
                            value={draftFields.externalTicketUrl}
                            onChange={(e) => updateDraftField('externalTicketUrl', e.target.value)}
                          />
                        </div>
                      </div>
                      <Link to={`/publisher/events/${event.id}/edit`} className="btn btn-secondary">
                        Open full editor
                      </Link>
                    </div>
                  )}
                  {draftAutosaveStatus && <p style={{ color: 'var(--gray-600)', margin: 0 }}>{draftAutosaveStatus}</p>}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-primary" onClick={handlePublish}>
                      Publish
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleShare}>
                      Share link
                    </button>
                  </div>
                </div>
              </section>
            )}

            {shouldShowSuccess && (
              <section style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h2 style={{ margin: 0 }}>Success panel</h2>
                  <button className="btn btn-secondary" onClick={handleShare}>Share event</button>
                </div>
                {postPublishStatus && <p style={{ color: 'var(--gray-600)' }}>{postPublishStatus}</p>}
                {postPublish && (
                  <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                    <SuccessPanelCard
                      title="You are live"
                      description={postPublish.isLive ? 'Your event is live on SEE.' : 'Publishing is still in progress.'}
                    >
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <div><strong>Status:</strong> {postPublish.isLive ? 'Live' : 'Pending'}</div>
                        <div><strong>Search index:</strong> {postPublish.inSearchIndex || 'Queued'}</div>
                        <div style={{ color: 'var(--gray-600)' }}>
                          Your event is searchable in: {event?.location || 'your city'} · {event?.category || 'your category'} · Playlists
                        </div>
                      </div>
                    </SuccessPanelCard>
                    <SuccessPanelCard
                      title="Placements"
                      description="Where your event is showing up."
                    >
                      {(postPublish.placements || []).length === 0 && (
                        <p style={{ color: 'var(--gray-600)', margin: 0 }}>Placements will appear here.</p>
                      )}
                      {(postPublish.placements || []).length > 0 && (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {postPublish.placements?.map(item => (
                            <div key={item.id || item.name} style={{ border: '1px solid var(--gray-200)', borderRadius: '0.5rem', padding: '0.6rem 0.8rem' }}>
                              <strong>{item.name || 'Placement'}</strong>
                              <div style={{ color: 'var(--gray-600)' }}>{item.status || 'Queued'}</div>
                              {item.reason && <div style={{ color: 'var(--gray-600)' }}>{item.reason}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </SuccessPanelCard>
                    <SuccessPanelCard
                      title="First metrics"
                      description="Your first wave of engagement."
                    >
                      <div style={{ display: 'grid', gap: '0.35rem' }}>
                        <div><strong>Views:</strong> {postPublish.firstMetrics?.views ?? 0}</div>
                        <div><strong>Saves:</strong> {postPublish.firstMetrics?.saves ?? 0}</div>
                        <div><strong>Shares:</strong> {postPublish.firstMetrics?.shares ?? 0}</div>
                        <div><strong>Ticket clicks:</strong> {postPublish.firstMetrics?.ticketClicks ?? 0}</div>
                        <div><strong>RSVPs:</strong> {postPublish.firstMetrics?.rsvpCount ?? 0}</div>
                      </div>
                    </SuccessPanelCard>
                    <SuccessPanelCard
                      title="Next best action"
                      description={postPublish.nextBestAction?.description || 'Boost your momentum with one quick step.'}
                    >
                      <button className="btn btn-primary" onClick={handleNextBestAction}>
                        {postPublish.nextBestAction?.cta || 'Take action'}
                      </button>
                      <p style={{ margin: '0.75rem 0 0', color: 'var(--gray-600)' }}>
                        We will notify you when saves and views increase.
                      </p>
                    </SuccessPanelCard>
                  </div>
                )}
              </section>
            )}

            <section className="card">
              <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
                <h2 style={{ margin: 0 }}>Timeline</h2>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <div style={{ borderLeft: '3px solid var(--primary-blue)', paddingLeft: '0.75rem' }}>
                    {event.status ? `Status: ${event.status}` : 'Draft created'}
                  </div>
                  {postPublish?.inSearchIndex && (
                    <div style={{ borderLeft: '3px solid var(--gray-200)', paddingLeft: '0.75rem' }}>
                      Search indexing: {postPublish.inSearchIndex}
                    </div>
                  )}
                  {postPublish?.firstMetrics?.shares !== undefined && (
                    <div style={{ borderLeft: '3px solid var(--gray-200)', paddingLeft: '0.75rem' }}>
                      Share activity: {postPublish.firstMetrics.shares} shares
                    </div>
                  )}
                  {summaryReady && (
                    <div style={{ borderLeft: '3px solid var(--gray-200)', paddingLeft: '0.75rem' }}>
                      Post-event summary ready. <Link to={`/publisher/events/${event.id}/summary`}>View summary</Link>
                    </div>
                  )}
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
                  <button className="btn btn-secondary" onClick={handleShare}>
                    Share event
                  </button>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                    Upload banner
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleBannerUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                  <button className="btn btn-secondary" onClick={() => navigate(`/publisher/events/${event.id}/edit`)}>
                    Edit details
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/publisher/events/${event.id}/page`)}>
                    Edit page layout
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/host/events/${event.id}/tickets`)}>
                    Edit tickets
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/publisher/events/${event.id}/analytics`)}>
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

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>{label}</dt>
      <dd style={{ margin: 0, color: 'var(--gray-800)', fontWeight: 600 }}>{value}</dd>
    </div>
  )
}
