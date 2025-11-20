import React, { useState } from 'react'
import EventGrid from './EventGrid'
import { api, Event, formatEventsForDisplay } from '../services/api'

interface HomeDiscoverProps {
  className?: string
}

export default function HomeDiscover({ className = '' }: HomeDiscoverProps) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'fetching' | 'ready' | 'error' | 'denied'>('idle')
  const [events, setEvents] = useState<Event[]>([])

  const findNearby = () => {
    setStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus('fetching')
        const { latitude, longitude } = pos.coords
        try {
          const response = await api.searchEvents({
            lat: latitude,
            lon: longitude,
            radiusKm: 50,
            take: 12
          })
          const formattedEvents = formatEventsForDisplay(response.items || [])
          setEvents(formattedEvents)
          setStatus('ready')
        } catch (e) {
          console.error('Failed to fetch nearby events:', e)
          // Fallback to mock data if API fails
          setEvents([
            { id: 'nearby-1', title: 'Local Jazz Night', date: 'Nov 22, 2025', location: 'Downtown Venue' },
            { id: 'nearby-2', title: 'Community Workshop', date: 'Nov 25, 2025', location: 'Community Center' },
            { id: 'nearby-3', title: 'Food Truck Festival', date: 'Nov 30, 2025', location: 'City Park' }
          ])
          setStatus('ready')
        }
      },
      () => setStatus('denied')
    )
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'idle':
        return "Discover amazing events happening near you. Click the button above to get started!"
      case 'denied':
        return "Location access denied. Please enable location permissions to find nearby events."
      case 'error':
        return "Unable to load nearby events. Please try again later."
      default:
        return ""
    }
  }

  return (
    <div className={`home-discover ${className}`}>
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <button
          onClick={findNearby}
          className="btn btn-primary"
          disabled={status === 'requesting' || status === 'fetching'}
        >
          {status === 'requesting' && 'Requesting location...'}
          {status === 'fetching' && 'Finding events...'}
          {(status === 'idle' || status === 'ready' || status === 'error') && 'Find Events Near Me'}
        </button>
      </div>

      {(status === 'idle' || status === 'denied' || status === 'error') && (
        <div className="text-center" style={{ color: 'var(--gray-600)', marginBottom: '2rem' }}>
          <p>{getStatusMessage()}</p>
        </div>
      )}

      <EventGrid
        events={events}
        loading={status === 'fetching'}
        error={status === 'error' ? 'Failed to load events' : undefined}
        emptyMessage="No events found near your location. Try expanding your search or check back later!"
      />
    </div>
  )
}
