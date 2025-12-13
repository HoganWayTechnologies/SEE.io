import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import DeepLinkButton from '../components/DeepLinkButton'
import Seo from '../components/Seo'
import Footer from '../components/Footer'
import SiteNav from '../components/SiteNav'
import { api, Event, seeApi, formatEventForDisplay, TicketType } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useRealtime } from '../context/RealtimeContext'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')

export default function EventPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const realtime = useRealtime()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [ticketsError, setTicketsError] = useState<string | null>(null)
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [ticketQuantity, setTicketQuantity] = useState(1)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [pageLayout, setPageLayout] = useState<any | null>(null)
  const [rsvpStatus, setRsvpStatus] = useState<'going' | 'interested' | 'bookmark' | 'none' | null>(null)
  const [rsvpSummary, setRsvpSummary] = useState<{ going: number; interested: number; bookmark: number } | null>(null)
  const [rsvpMessage, setRsvpMessage] = useState<string | null>(null)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportCategory, setReportCategory] = useState('spam')
  const [reportNotes, setReportNotes] = useState('')
  const [reportStatus, setReportStatus] = useState<string | null>(null)
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([])
  const [relatedStatus, setRelatedStatus] = useState<string | null>(null)
  const [navSearchTerm, setNavSearchTerm] = useState('')
  const handleNavSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (navSearchTerm.trim()) params.set('tag', navSearchTerm.trim())
    navigate(`/discover${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const navSearchSlot = (
    <form className="nav-search-form" onSubmit={handleNavSearchSubmit}>
      <div className="nav-search-field">
        <input
          className="form-input nav-search-input"
          placeholder="Search more events, cities, or vibes"
          value={navSearchTerm}
          onChange={(e) => setNavSearchTerm(e.target.value)}
        />
        <button className="nav-search-button" type="submit" aria-label="Search events">
          🔍
        </button>
      </div>
    </form>
  )

  const renderNav = () => <SiteNav searchSlot={navSearchSlot} />

  const recordEventInteraction = useCallback(
    async (type: 'view' | 'click' | 'save' | 'bookmark' | 'share' | 'ticket' | 'map', source: string) => {
      const eventId = event?.id || id
      if (!eventId) return
      try {
        await api.recordEventInteraction(eventId, { type, source })
      } catch (err) {
        console.debug('interaction track failed', err)
      }
    },
    [event?.id, id]
  )

  const renderBlock = (block: any, idx: number) => {
    const settings = block?.settings || {}
    if (block.type === 'hero') {
      return (
        <section key={block.id || idx} className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, var(--primary-blue), #4a90e2)', color: '#fff' }}>
          <div className="card-body">
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{settings.heading || 'Event hero'}</h2>
            {settings.subheading && <p style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{settings.subheading}</p>}
            {settings.cta && (
              <a href={settings.link || '#'} className="btn btn-secondary" style={{ marginTop: '0.5rem' }}>
                {settings.cta}
              </a>
            )}
          </div>
        </section>
      )
    }
    if (block.type === 'text') {
      return (
        <div key={block.id || idx} className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{settings.text || 'Text block'}</p>
          </div>
        </div>
      )
    }
    if (block.type === 'image') {
      const mediaUrl = (() => {
        if (settings.url) return settings.url
        if (settings.mediaId && Array.isArray((pageLayout as any)?.media)) {
          const match = (pageLayout as any).media.find((m: any) => m.id === settings.mediaId || m.mediaId === settings.mediaId)
          return match?.url
        }
        return null
      })()
      return (
        <div key={block.id || idx} className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            {mediaUrl && <img src={mediaUrl} alt={settings.alt || ''} style={{ width: '100%', borderRadius: '0.5rem' }} />}
            {!mediaUrl && <p style={{ color: 'var(--gray-600)' }}>Image block (connect media in builder)</p>}
          </div>
        </div>
      )
    }
    if (block.type === 'gallery') {
      const mediaList = (settings.mediaIds || []).map((id: string) => {
        if (Array.isArray((pageLayout as any)?.media)) {
          const match = (pageLayout as any).media.find((m: any) => m.id === id || m.mediaId === id)
          return match?.url
        }
        return null
      }).filter(Boolean)
      return (
        <div key={block.id || idx} className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <h4 className="card-title">Gallery</h4>
            <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
              {mediaList.length === 0 && <p style={{ color: 'var(--gray-600)' }}>No media selected</p>}
              {mediaList.map((url: string, i: number) => (
                <img key={i} src={url} alt="" style={{ width: '100%', borderRadius: '0.35rem', objectFit: 'cover', height: '120px' }} />
              ))}
            </div>
          </div>
        </div>
      )
    }
    if (block.type === 'cta') {
      return (
        <div key={block.id || idx} className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <h4 style={{ margin: 0 }}>{settings.heading || 'Call to action'}</h4>
            {settings.body && <p style={{ color: 'var(--gray-700)' }}>{settings.body}</p>}
            {settings.button && (
              <a href={settings.link || '#'} className="btn btn-primary">{settings.button}</a>
            )}
          </div>
        </div>
      )
    }
    if (block.type === 'faq') {
      return (
        <div key={block.id || idx} className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <h4 className="card-title">FAQ</h4>
            <ul style={{ paddingLeft: '1.25rem' }}>
              {(settings.items || []).map((item: any, i: number) => (
                <li key={i} style={{ marginBottom: '0.35rem' }}>
                  <strong>{item.q}</strong>
                  <div style={{ color: 'var(--gray-700)' }}>{item.a}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )
    }
    return (
      <div key={block.id || idx} className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <strong>{block.type || 'Block'}</strong>
          <pre className="code-block">{JSON.stringify(block.settings || {}, null, 2)}</pre>
        </div>
      </div>
    )
  }

  useEffect(() => {
    const loadEvent = async () => {
      if (!id) return

      try {
        setLoading(true)
        // Try to get event from our API first, fallback to direct SEE.API
        let eventData: Event
        try {
          // This would be a specific event endpoint if available
          const response = await api.searchEvents({ query: id, take: 1 })
          if (response.items && response.items.length > 0) {
            eventData = formatEventForDisplay(response.items[0])
          } else {
            throw new Error('Event not found in search results')
          }
        } catch {
          // Fallback to direct SEE.API call
          eventData = await seeApi.getEvent(id)
          eventData = formatEventForDisplay(eventData)
        }

        setEvent(eventData)
        recordEventInteraction('view', 'event_page')
      } catch (err) {
        console.error('Failed to load event:', err)
        setEvent(null)
        setError('Event could not be loaded from the API.')
      } finally {
        setLoading(false)
      }
    }

    loadEvent()
  }, [id])

  useEffect(() => {
    let cancelled = false
    const loadRelated = async () => {
      if (!event) {
        setRelatedEvents([])
        setRelatedStatus(null)
        return
      }
      const tag = Array.isArray(event.tags) && event.tags.length > 0 ? event.tags[0] : null
      const searchKey = tag || event.category
      if (!searchKey) {
        setRelatedEvents([])
        setRelatedStatus(null)
        return
      }
      try {
        setRelatedStatus('Loading related events…')
        const resp = await seeApi.searchEvents({ query: searchKey, take: 6 })
        const items = (resp.items || []).filter(item => item.id !== event.id)
        if (!cancelled) {
          setRelatedEvents(items.slice(0, 4))
          setRelatedStatus(items.length ? null : 'No similar events yet.')
        }
      } catch (err) {
        if (!cancelled) {
          setRelatedStatus('Unable to load related events right now.')
        }
      }
    }
    loadRelated()
    return () => {
      cancelled = true
    }
  }, [event?.id, event?.category, event?.tags?.join(',')])

  useEffect(() => {
    const loadTickets = async () => {
      if (!id) return
      try {
        const ticketResp = await api.fetchEventTickets(id)
        setTickets(ticketResp)
        setTicketsError(null)
      } catch (err: any) {
        setTickets([])
        setTicketsError('Ticket data unavailable')
        console.warn('ticket fetch failed', err)
      }
    }
    loadTickets()
  }, [id])

  useEffect(() => {
    const loadShareAndReviews = async () => {
      if (!id) return
      try {
        const share = await api.getEventShareLink(id)
        setShareUrl(share?.shareUrl || share?.url || share?.link || null)
      } catch {
        setShareUrl(null)
      }
      try {
        const eventReviews = await api.fetchEventReviews(id)
        setReviews(Array.isArray(eventReviews) ? eventReviews : (eventReviews?.items || []))
      } catch {
        setReviews([])
      }
    }
    loadShareAndReviews()
  }, [id])

  useEffect(() => {
    if (!shareMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShareMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [shareMenuOpen])

  useEffect(() => {
    const loadPage = async () => {
      if (!id) return
      try {
        const token = searchParams.get('previewToken') || undefined
        const page = await api.fetchPublicEventPage(id, token || undefined)
        setPageLayout(page?.page || page || null)
      } catch (err) {
        setPageLayout(null)
      }
    }
    loadPage()
  }, [id, searchParams])

  useEffect(() => {
    const loadRsvp = async () => {
      if (!id) return
      try {
        const summary = await api.fetchEventRsvpSummary(id)
        setRsvpSummary(summary)
      } catch {
        setRsvpSummary(null)
      }
      if (auth.idToken) {
        try {
          const statusResp = await api.fetchEventRsvpStatus(id, auth.idToken)
          setRsvpStatus(statusResp?.status || null)
        } catch {
          setRsvpStatus(null)
        }
      } else {
        setRsvpStatus(null)
      }
    }
    loadRsvp()
  }, [id, auth.idToken])

  useEffect(() => {
    if (!id) return
    const unsub = realtime.addListener('rsvpSummaryUpdated', (payload: any) => {
      if (payload?.eventId !== id) return
      setRsvpSummary({
        going: payload.going ?? 0,
        interested: payload.interested ?? 0,
        bookmark: payload.bookmarked ?? 0
      })
    })
    realtime.joinEvent(id)
    return () => {
      realtime.leaveEvent(id)
      unsub()
    }
  }, [id, realtime])

  const handleTicketPurchase = async () => {
    if (!id || !selectedTicketId) {
      setPurchaseStatus('Please select a ticket type.')
      return
    }
    const ticket = tickets.find(t => t.id === selectedTicketId)
    if (!ticket) {
      setPurchaseStatus('That ticket is no longer available.')
      return
    }
    if (ticket.quantityAvailable !== null && ticket.quantityAvailable <= 0) {
      setPurchaseStatus('This ticket type is sold out.')
      return
    }
    const idToken = auth.idToken
    if (!idToken) {
      setPurchaseStatus('Sign in first so we can purchase tickets.')
      return
    }

    const selected = tickets.find(t => t.id === selectedTicketId)
    const isFree = (selected?.price ?? 0) <= 0

    try {
      setPurchaseStatus('Processing...')
      recordEventInteraction('ticket', 'see_checkout')

      if (isFree) {
        await api.purchaseTicket(id, selectedTicketId, ticketQuantity, idToken)
        setPurchaseStatus('Success! Check your email for confirmation.')
        return
      }

      // Paid tickets: require Stripe checkout to succeed; do not fall back automatically.
      const checkout = await api.createStripeCheckout(id, selectedTicketId, ticketQuantity, idToken)
      const redirectUrl =
        checkout?.url ||
        checkout?.checkoutUrl ||
        checkout?.checkoutSessionUrl ||
        checkout?.stripeUrl ||
        checkout?.redirectUrl
      if (redirectUrl) {
        window.location.href = redirectUrl
        return
      }
      if (checkout?.clientSecret || checkout?.paymentIntentId || checkout?.checkoutId) {
        setPurchaseStatus('Stripe checkout created. Complete payment to finalize your ticket.')
        return
      }

      setPurchaseStatus('Unable to start checkout for this ticket. Please try again or choose another ticket.')
    } catch (err: any) {
      console.warn('Ticket checkout failed', err)
      setPurchaseStatus(err?.message || 'Unable to start checkout. Please try again.')
    }
  }

  const handleCopyShareLink = async (source: string) => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1800)
    } catch (e) {
      console.error('copy failed', e)
    }
    recordEventInteraction('share', source)
  }

  const handleRsvp = async (status: 'going' | 'interested' | 'bookmark' | 'none') => {
    if (!id) return
    if (!auth.idToken) {
      setRsvpMessage('Sign in to save your RSVP.')
      return
    }
    try {
      setRsvpMessage('Saving RSVP…')
      const resp = await api.updateEventRsvp(id, status, auth.idToken)
      setRsvpStatus(resp.status)
      try {
        const summary = await api.fetchEventRsvpSummary(id)
        setRsvpSummary(summary)
      } catch {
        // ignore summary failures
      }
      setRsvpMessage('RSVP updated.')
    } catch (err: any) {
      setRsvpMessage(err?.message || 'Unable to update RSVP right now.')
    }
  }

  if (loading) {
    return (
      <div>
        {/* Navigation */}
        {renderNav()}

        <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--gray-200)',
            borderTop: '4px solid var(--primary-blue)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading event details...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div>
        {/* Navigation */}
        {renderNav()}

        <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--error-red)', marginBottom: '1rem' }}>Event Not Found</h1>
          <p>The event you're looking for doesn't exist or has been removed.</p>
          <Link to="/discover" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Browse Events
          </Link>
        </div>
      </div>
    )
  }

  const normalizedAdmissionType = (event.admissionType || '').toLowerCase()
  const normalizedTags = Array.isArray(event.tags)
    ? event.tags.map(tag => (tag || '').toLowerCase())
    : []
  const hasInternalTicketing = Boolean(event.hasInternalTickets ?? (tickets.length > 0))
  const isSeeTicketed = normalizedAdmissionType === 'see_ticketed' && hasInternalTicketing
  const isFreeAdmission = normalizedAdmissionType === 'free'
  const isExternalTicketed = normalizedAdmissionType === 'external_ticketed' && !hasInternalTicketing
  const isCanceled = (event.status || '').toLowerCase() === 'canceled'
  const isRejected = (event.status || '').toLowerCase() === 'rejected'
  const isInactive = isCanceled || isRejected
  const isDiscountEvent = normalizedTags.some(tag =>
    ['groupon', 'discount', 'deal'].includes(tag)
  )
  const pricingHeading = (() => {
    if (isCanceled) return 'Event canceled'
    if (isSeeTicketed && event.price) return event.price
    if (isSeeTicketed) return 'Tickets available'
    if (isFreeAdmission) return 'Free event'
    if (isExternalTicketed && event.price) return event.price
    if (isExternalTicketed) return 'Ticketed via partner'
    if (isDiscountEvent && !hasInternalTicketing) return 'Special offer'
    return 'Ticket details TBA'
  })()
  const pricingSubtext = (() => {
    if (isCanceled) return 'This event has been canceled.'
    if (isSeeTicketed && event.price) return 'per ticket'
    if (isSeeTicketed) return 'Tickets sold on SEE'
    if (isFreeAdmission) return 'No purchase required'
    if (isExternalTicketed) return 'Tickets sold on partner site'
    if (isDiscountEvent && !hasInternalTicketing) return 'Redeem via partner link'
    return 'We will update this section once admission details are confirmed.'
  })()
  const externalTicketUrl = event.externalTicketUrl || null
  // Resolve banner image from common possible fields without strict typing
  const bannerUrl =
    ((event as any)?.bannerUrl) ||
    ((event as any)?.imageUrl) ||
    ((event as any)?.coverImage) ||
    (((event as any)?.media && (event as any).media[0] && (event as any).media[0].url) ? (event as any).media[0].url : null) ||
    null

  const canonicalUrl = `${SITE_URL}/event/${encodeURIComponent(event?.id || id || '')}`
  const seoDescription =
    event?.description ||
    `Get tickets and info for ${event?.title || 'this SEE.io event'}.`
  const eventStructuredData = event
    ? {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        startDate: event.startUtc || event.date,
        endDate: event.endUtc || undefined,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        description: event.description,
        image: event.image,
        location: event.location || event.venue
          ? {
              '@type': 'Place',
              name: event.venue || event.location,
              address: event.location
            }
          : undefined,
        organizer: event.organizer
          ? {
              '@type': 'Organization',
              name: event.organizer
            }
          : undefined,
        offers:
          event.price || isSeeTicketed
            ? {
                '@type': 'Offer',
                price: event.price || undefined,
                availability: 'https://schema.org/InStock',
                url: canonicalUrl
              }
            : undefined
      }
    : undefined
  const businessPagePath = event?.businessSlug
    ? `/business/${event.businessSlug}`
    : event?.businessId
      ? `/business/${event.businessId}`
      : null
  const businessDisplayName = event?.businessName || event?.hostDisplayName || event?.organizer || null
  const metaDetails: { label: string; value: React.ReactNode }[] = [
    { label: 'Category', value: event?.category ? event.category.replace(/_/g, ' ') : null },
    { label: 'Status', value: event?.status ? event.status.replace(/_/g, ' ') : null },
    {
      label: 'Admission',
      value: event?.admissionType ? event.admissionType.replace(/_/g, ' ') : null
    },
    { label: 'Timezone', value: event?.timezone },
    { label: 'Venue', value: event?.venueName },
    { label: 'Address', value: event?.venueAddress },
    businessDisplayName
      ? {
          label: 'Hosted By',
          value: businessPagePath
            ? <Link to={businessPagePath} style={{ color: 'var(--primary-blue)' }}>{businessDisplayName}</Link>
            : businessDisplayName
        }
      : null
  ].filter((detail): detail is { label: string; value: React.ReactNode } => Boolean(detail && detail.value))
  const reportReasons = [
    { value: 'spam', label: 'Spam or scam' },
    { value: 'misleading', label: 'Incorrect or misleading info' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'rights', label: 'Copyright or rights issue' },
    { value: 'other', label: 'Something else' }
  ]

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      setReportStatus('Submitting report…')
      await api.submitReport({
        eventId: id,
        reason: reportCategory,
        details: reportNotes
      })
      setReportStatus('Thanks for letting us know.')
      setReportNotes('')
      setTimeout(() => {
        setReportModalOpen(false)
        setReportStatus(null)
      }, 1400)
    } catch (err: any) {
      setReportStatus(err?.message || 'Unable to submit report right now.')
    }
  }

  return (
    <div>
      <Seo
        title={event?.title || 'Event Details'}
        description={seoDescription}
        canonical={canonicalUrl}
        image={bannerUrl || undefined}
        structuredData={eventStructuredData}
      />
      {/* Navigation */}
      {renderNav()}

      {/* Event Details */}
      <div className="container" style={{ padding: '2rem 0' }}>
        {/* Banner across the top of the container */}
        <div style={{ marginBottom: '1.25rem' }}>
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt={event.title + ' banner'}
              style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: '0.5rem' }}
            />
          ) : (
            <div style={{ width: '100%', height: '320px', background: 'linear-gradient(90deg, var(--gray-100), var(--gray-50))', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)' }}>
              <span>Event banner (no image provided)</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
          {/* Main Content */}
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '1rem' }}>
              {event.title}
            </h1>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary-blue)', marginRight: '0.5rem' }}>📅</span>
                <span>{event.date} {event.time && `at ${event.time}`}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary-blue)', marginRight: '0.5rem' }}>📍</span>
                <span>{event.location}</span>
              </div>
              {businessDisplayName && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: 'var(--primary-blue)', marginRight: '0.5rem' }}>👤</span>
                  {businessPagePath ? (
                    <Link to={businessPagePath} style={{ color: 'var(--primary-blue)', fontWeight: 600 }}>
                      {businessDisplayName}
                    </Link>
                  ) : (
                    <span>Organized by {businessDisplayName}</span>
                  )}
                </div>
              )}
              {shareUrl && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    className="btn"
                    onClick={() => handleCopyShareLink('hero_copy')}
                    title="Copy link"
                    aria-label="Copy link"
                    style={{ border: '1px solid var(--gray-200)', padding: '0.45rem', borderRadius: '0.35rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M16 1H8a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="8" y="7" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {copySuccess && <span style={{ color: 'var(--primary-blue)', marginLeft: '0.5rem' }}>Copied!</span>}
                </div>
              )}
            </div>

            {event.description && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-body">
                  <h3 className="card-title">About This Event</h3>
                  <p className="card-text">{event.description}</p>
                </div>
              </div>
            )}

            {pageLayout && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-body">
                  <h3 className="card-title">Event Page</h3>
                  <p style={{ color: 'var(--gray-600)' }}>Preview of the custom event page layout.</p>
                  {(pageLayout?.blocks || []).map(renderBlock)}
                </div>
              </div>
            )}

            {metaDetails.length > 0 && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-body">
                  <h3 className="card-title">Event details</h3>
                  <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {metaDetails.map((detail, index) => (
                      <div key={`${detail.label}-${index}`} style={{ borderLeft: '3px solid var(--gray-100)', paddingLeft: '0.75rem' }}>
                        <dt style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                          {detail.label}
                        </dt>
                        <dd style={{ margin: 0, fontWeight: 600, color: 'var(--gray-800)' }}>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            )}

            {Array.isArray(event.tags) && event.tags.length > 0 && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-body">
                  <h3 className="card-title">Tags</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {event.tags.map(tag => (
                      <Link key={tag} to={`/discover?tag=${encodeURIComponent(tag)}`} className="chip chip-active" style={{ textTransform: 'lowercase' }}>
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="card" style={{ marginBottom: '2rem' }}>
              <div className="card-body">
                <h3 className="card-title">Community Reviews</h3>
                {reviews.length === 0 && <p style={{ color: 'var(--gray-600)' }}>No reviews yet.</p>}
                {reviews.length > 0 && (
                  <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                    {reviews.map((rev: any) => (
                      <li key={rev.id || rev.reviewId} style={{ marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{rev.title || rev.author || 'Guest'}</div>
                        <div style={{ color: 'var(--gray-700)' }}>{rev.text || rev.comment || rev.body}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gray-500)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  padding: 0
                }}
                aria-label="Report this event"
              >
                🚩 Report this event
              </button>
            </div>

            {relatedEvents.length > 0 && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-body">
                  <h3 className="card-title">Related events</h3>
                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    {relatedEvents.map(item => (
                      <Link key={item.id} to={`/event/${item.id}`} className="card" style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        <div style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>
                          {item.date}{item.time ? ` · ${item.time}` : ''}
                        </div>
                        <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{item.location}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {relatedStatus && !relatedEvents.length && (
              <p style={{ color: 'var(--gray-600)' }}>{relatedStatus}</p>
            )}

            {error && (
              <div style={{
                backgroundColor: 'var(--light-purple)',
                padding: '1rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--accent-purple)',
                marginBottom: '2rem'
              }}>
                <p style={{ margin: '0', fontSize: '0.875rem', color: 'var(--accent-purple)' }}>
                  <strong>Note:</strong> {error}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="card" style={{ position: 'sticky', top: '2rem' }}>
              <div className="card-body">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>
                    {pricingHeading}
                  </div>
                  <p style={{ color: 'var(--gray-600)', margin: '0' }}>
                    {pricingSubtext}
                  </p>
                </div>

                {!isInactive && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.35rem' }}>RSVP</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(['going', 'interested', 'bookmark'] as const).map(key => (
                        <button
                          key={key}
                          className={`chip ${rsvpStatus === key ? 'chip-active' : ''}`}
                          type="button"
                          onClick={() => handleRsvp(key)}
                        >
                          {key === 'going' ? 'Going' : key === 'interested' ? 'Interested' : 'Save'}
                        </button>
                      ))}
                      {rsvpStatus && rsvpStatus !== 'none' && (
                        <button className="chip" type="button" onClick={() => handleRsvp('none')}>Clear</button>
                      )}
                    </div>
                    {rsvpSummary && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                        Going {rsvpSummary.going ?? 0} · Interested {rsvpSummary.interested ?? 0} · Saved {rsvpSummary.bookmark ?? 0}
                      </div>
                    )}
                    {rsvpMessage && <div style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>{rsvpMessage}</div>}
                  </div>
                )}

                {isSeeTicketed && !isInactive && (
                  <>
                    {tickets.length > 0 ? (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Tickets</h4>
                        <select
                          className="form-input"
                          value={selectedTicketId || ''}
                          onChange={(e) => setSelectedTicketId(e.target.value)}
                        >
                          <option value="">Select ticket</option>
                          {tickets.map(ticket => (
                            <option key={ticket.id} value={ticket.id}>
                              {ticket.name} — {ticket.price ?? 'Free'}
                              {ticket.quantityAvailable !== null ? ` (Avail ${ticket.quantityAvailable})` : ''}
                            </option>
                          ))}
                        </select>
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <label>Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={ticketQuantity}
                            onChange={(e) => setTicketQuantity(Math.max(1, Number(e.target.value)))}
                            className="form-input"
                            style={{ width: '80px' }}
                          />
                          <button className="btn btn-secondary" type="button" onClick={handleTicketPurchase}>
                            Purchase
                          </button>
                        </div>
                        {purchaseStatus && (
                          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{purchaseStatus}</p>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        SEE tickets for this event are not available yet. Check back soon.
                      </p>
                    )}
                    {ticketsError && (
                      <p style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{ticketsError}</p>
                    )}
                  </>
                )}

                {isFreeAdmission && (
                  <div style={{ background: 'var(--gray-100)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                    <strong>Free to attend</strong>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--gray-700)', fontSize: '0.9rem' }}>
                      No ticket purchase is required. Arrive early to grab your spot.
                    </p>
                  </div>
                )}

                {!isSeeTicketed && !isFreeAdmission && !externalTicketUrl && (
                  <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Ticket information for this event has not been provided yet. Follow or bookmark the event and check back for updates.
                  </p>
                )}

                {!isInactive && externalTicketUrl ? (
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', marginBottom: '1.5rem' }}
                    type="button"
                    onClick={() => {
                      recordEventInteraction('ticket', 'partner_link')
                      window.open(externalTicketUrl, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    Tickets & Info
                  </button>
                ) : !isInactive ? (
                  <DeepLinkButton eventId={event.id} />
                ) : null}

                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Share this event</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} ref={shareMenuRef}>
                      {/* Three-dot menu toggle */}
                      <button
                        aria-haspopup="menu"
                        aria-expanded={shareMenuOpen}
                        title="More sharing options"
                        onClick={() => setShareMenuOpen(open => !open)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <circle cx="5" cy="12" r="2" fill="currentColor" />
                          <circle cx="12" cy="12" r="2" fill="currentColor" />
                          <circle cx="19" cy="12" r="2" fill="currentColor" />
                        </svg>
                      </button>

                      {/* Inline copy icon as a standalone quick action */}
                      <button
                        className="btn"
                        onClick={() => handleCopyShareLink('share_panel_copy')}
                        title="Copy link"
                        aria-label="Copy link"
                        style={{ border: '1px solid var(--gray-200)', padding: '0.45rem', borderRadius: '0.35rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M16 1H8a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <rect x="8" y="7" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {copySuccess && <span style={{ color: 'var(--primary-blue)', fontSize: '0.875rem' }}>Copied!</span>}

                      {/* Dropdown menu */}
                      {shareMenuOpen && (
                        <div role="menu" aria-label="Share options" style={{ position: 'absolute', background: 'white', border: '1px solid var(--gray-200)', boxShadow: '0 6px 18px rgba(20,20,30,0.06)', borderRadius: '6px', padding: '0.5rem', right: '1rem', zIndex: 60 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '180px' }}>
                            <button
                              onClick={() => {
                                handleCopyShareLink('share_menu_copy')
                                setShareMenuOpen(false)
                              }}
                              role="menuitem"
                              title="Copy link"
                              style={{ textAlign: 'left', padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                              Copy link
                            </button>

                            <a
                              role="menuitem"
                              href={shareUrl ? `https://socxal.com/share?u=${encodeURIComponent(shareUrl)}` : '#'}
                              onClick={() => {
                                recordEventInteraction('share', 'socxal')
                                setShareMenuOpen(false)
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textAlign: 'left', padding: '0.5rem', color: 'inherit', textDecoration: 'none' }}
                            >
                              Open in Socxal
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {reportModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 80 }}>
          <div className="card" style={{ width: '90%', maxWidth: '480px', background: '#fff' }}>
            <div className="card-body">
              <h3 className="card-title">Report this event</h3>
              <p style={{ color: 'var(--gray-600)' }}>Tell us what’s wrong so our team can investigate.</p>
              <form onSubmit={handleReportSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <label className="form-label">Reason</label>
                  <select className="form-input" value={reportCategory} onChange={(e) => setReportCategory(e.target.value)}>
                    {reportReasons.map(reason => (
                      <option key={reason.value} value={reason.value}>{reason.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Details (optional)</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Add context, links, or timestamps"
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setReportModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit report</button>
                </div>
                {reportStatus && <p style={{ margin: 0, color: 'var(--gray-600)' }}>{reportStatus}</p>}
              </form>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  )
}
