import React, { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import DeepLinkButton from '../components/DeepLinkButton'
import UserMenu from '../components/UserMenu'
import NotificationBell from '../components/NotificationBell'
import { api, Event, seeApi, formatEventForDisplay, TicketType } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function EventPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const auth = useAuth()
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

  const handleTicketPurchase = async () => {
    if (!id || !selectedTicketId) {
      setPurchaseStatus('Please select a ticket type.')
      return
    }
    const idToken = auth.idToken
    if (!idToken) {
      setPurchaseStatus('Sign in first so we can purchase tickets.')
      return
    }
    try {
      setPurchaseStatus('Processing...')
      // Try Stripe checkout if available; fall back to direct purchase.
      try {
        const checkout = await api.createStripeCheckout(id, selectedTicketId, ticketQuantity, idToken)
        if (checkout?.clientSecret || checkout?.paymentIntentId) {
          setPurchaseStatus('Stripe checkout created. Complete payment to finalize your ticket.')
          return
        }
      } catch (err) {
        console.warn('Stripe checkout failed, falling back to purchase', err)
      }
      await api.purchaseTicket(id, selectedTicketId, ticketQuantity, idToken)
      setPurchaseStatus('Success! Check your email for confirmation.')
    } catch (err: any) {
      setPurchaseStatus(err?.message || 'Purchase failed')
    }
  }

  if (loading) {
    return (
      <div>
        {/* Navigation */}
        <nav className="nav">
          <div className="container nav-container">
            <Link to="/" className="nav-brand">SEE.io</Link>
            <div className="nav-links">
            <Link to="/discover" className="nav-link">Discover</Link>
            <Link to="/saved" className="nav-link">Saved</Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </nav>

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
        <nav className="nav">
          <div className="container nav-container">
            <Link to="/" className="nav-brand">SEE.io</Link>
            <div className="nav-links">
            <Link to="/discover" className="nav-link">Discover</Link>
            <Link to="/saved" className="nav-link">Saved</Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </nav>

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

  return (
    <div>
      {/* Navigation */}
      <nav className="nav">
        <div className="container nav-container">
          <Link to="/" className="nav-brand">SEE.io</Link>
          <div className="nav-links">
            <Link to="/discover" className="nav-link">Discover</Link>
            <Link to="/saved" className="nav-link">Saved</Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Event Details */}
      <div className="container" style={{ padding: '2rem 0' }}>
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
              {event.organizer && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: 'var(--primary-blue)', marginRight: '0.5rem' }}>👤</span>
                  <span>Organized by {event.organizer}</span>
                </div>
              )}
              {shareUrl && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      try { navigator.clipboard?.writeText(shareUrl) } catch {}
                    }}
                  >
                    Copy share link
                  </button>
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
                    {event.price || 'Free'}
                  </div>
                  <p style={{ color: 'var(--gray-600)', margin: '0' }}>
                    {event.price ? 'per ticket' : 'No tickets required'}
                  </p>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
                  {event.price ? 'Get Tickets' : 'RSVP'}
                </button>

                {tickets.length > 0 && (
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
                )}
                {ticketsError && (
                  <p style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{ticketsError}</p>
                )}

                <DeepLinkButton eventId={event.id} />

                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Share this event</h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ flex: '1', fontSize: '0.875rem' }}>Facebook</button>
                    <button className="btn btn-secondary" style={{ flex: '1', fontSize: '0.875rem' }}>Twitter</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
