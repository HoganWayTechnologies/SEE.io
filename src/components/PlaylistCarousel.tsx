import React, { useEffect, useRef, useState } from 'react'
import EventCard from './EventCard'
import {
  api,
  Event,
  EventPlaylistSummary,
  formatEventsForDisplay
} from '../services/api'

type PlaylistCarouselProps = {
  playlist: EventPlaylistSummary
  accentColor?: string
}

const SCROLL_FRACTION = 0.85

export default function PlaylistCarousel({ playlist, accentColor = 'var(--primary-blue)' }: PlaylistCarouselProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loc, setLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [locRequested, setLocRequested] = useState(false)
  const trackRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (playlist.requiresLocation && !locRequested) {
      setLocRequested(true)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => setError('Turn on location to load nearby picks.'),
          { maximumAge: 60_000 }
        )
      } else {
        setError('Location is required for this playlist.')
      }
    }
  }, [playlist.requiresLocation, locRequested])

  useEffect(() => {
    let cancelled = false
    const loadPlaylist = async () => {
      if (playlist.requiresLocation && !loc) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        setError(null)
        const resp = await api.fetchEventPlaylist(playlist.id, loc || undefined)
        if (cancelled) return
        setEvents(formatEventsForDisplay(resp?.items || []))
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load playlist events', err)
        setEvents([])
        setError('Unable to load this playlist right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadPlaylist()
    return () => {
      cancelled = true
    }
  }, [playlist.id, playlist.requiresLocation, loc])

  const scrollByDistance = (direction: number) => {
    const node = trackRef.current
    if (!node) return
    const distance = Math.max(node.clientWidth * SCROLL_FRACTION, 280)
    node.scrollBy({ left: direction * distance, behavior: 'smooth' })
  }

  const renderBody = () => {
    if (loading) {
      return (
        <div className="playlist-carousel-empty">
          <div className="loading-spinner" />
        </div>
      )
    }
    if (error) {
      return (
        <div className="playlist-carousel-empty" style={{ color: 'var(--error-red)' }}>
          {error}
        </div>
      )
    }
    if (events.length === 0) {
      return (
        <div className="playlist-carousel-empty" style={{ color: 'var(--gray-600)' }}>
          No events available right now.
        </div>
      )
    }
    return (
      <div
        className="playlist-carousel-track"
        ref={trackRef}
      >
        {events.map(event => (
          <div key={event.id} className="playlist-carousel-card">
            <EventCard
              id={event.id}
              title={event.title}
              date={event.date}
              location={event.location}
              promoted={event.promoted}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <section className="playlist-carousel card">
      <div className="card-body">
        <div className="playlist-carousel-header">
          <div>
            <h3 style={{ margin: 0 }}>{playlist.title}</h3>
            {playlist.description && (
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--gray-600)', maxWidth: '42rem' }}>
                {playlist.description}
              </p>
            )}
          </div>
          <div className="playlist-carousel-controls">
            <button className="btn btn-secondary" aria-label="Scroll left" onClick={() => scrollByDistance(-1)}>
              ←
            </button>
            <button className="btn btn-secondary" aria-label="Scroll right" onClick={() => scrollByDistance(1)}>
              →
            </button>
          </div>
        </div>

        <div className="playlist-carousel-body">
          {renderBody()}
        </div>

        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--gray-500)' }}>
          Swipe or use the arrows to browse.
        </p>
      </div>
      <style>{`
        .playlist-carousel {
          border-left: 4px solid ${accentColor};
        }
        .playlist-carousel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .playlist-carousel-controls {
          display: flex;
          gap: 0.5rem;
        }
        .playlist-carousel-body {
          position: relative;
          margin-top: 1rem;
        }
        .playlist-carousel-track {
          display: grid;
          gap: 1rem;
          grid-auto-flow: column;
          grid-auto-columns: minmax(240px, 320px);
          overflow-x: auto;
          padding-bottom: 0.5rem;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }
        .playlist-carousel-track::-webkit-scrollbar {
          display: none;
        }
        .playlist-carousel-card {
          scroll-snap-align: start;
        }
        .playlist-carousel-empty {
          min-height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          width: 100%;
        }
        .playlist-carousel .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--gray-200);
          border-top: 3px solid ${accentColor};
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  )
}
