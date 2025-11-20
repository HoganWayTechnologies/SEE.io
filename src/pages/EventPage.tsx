import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import DeepLinkButton from '../components/DeepLinkButton'
import { api, Event, seeApi, formatEventForDisplay } from '../services/api'

export default function EventPage() {
  const { id } = useParams()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        // Fallback to mock data
        setEvent({
          id: id || 'demo',
          title: "Summer Music Festival 2025",
          date: "December 15, 2025",
          time: "7:00 PM - 11:00 PM",
          location: "Central Park Amphitheater",
          description: "Join us for an unforgettable night of music featuring top artists from around the world. This outdoor festival brings together diverse genres and creates an atmosphere of celebration and community.",
          price: "$45 - $125",
          organizer: "Music Events Co."
        })
        setError('Using demo data - API unavailable')
      } finally {
        setLoading(false)
      }
    }

    loadEvent()
  }, [id])

  if (loading) {
    return (
      <div>
        {/* Navigation */}
        <nav className="nav">
          <div className="container nav-container">
            <a href="/" className="nav-brand">SEE.io</a>
            <div className="nav-links">
              <a href="/discover" className="nav-link">Discover</a>
              <a href="/auth" className="btn btn-primary">Sign In</a>
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
            <a href="/" className="nav-brand">SEE.io</a>
            <div className="nav-links">
              <a href="/discover" className="nav-link">Discover</a>
              <a href="/auth" className="btn btn-primary">Sign In</a>
            </div>
          </div>
        </nav>

        <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--error-red)', marginBottom: '1rem' }}>Event Not Found</h1>
          <p>The event you're looking for doesn't exist or has been removed.</p>
          <a href="/discover" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Browse Events
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Navigation */}
      <nav className="nav">
        <div className="container nav-container">
          <a href="/" className="nav-brand">SEE.io</a>
          <div className="nav-links">
            <a href="/discover" className="nav-link">Discover</a>
            <a href="/auth" className="btn btn-primary">Sign In</a>
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
            </div>

            {event.description && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-body">
                  <h3 className="card-title">About This Event</h3>
                  <p className="card-text">{event.description}</p>
                </div>
              </div>
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
                    {event.price || 'Free'}
                  </div>
                  <p style={{ color: 'var(--gray-600)', margin: '0' }}>
                    {event.price ? 'per ticket' : 'No tickets required'}
                  </p>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
                  {event.price ? 'Get Tickets' : 'RSVP'}
                </button>

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
