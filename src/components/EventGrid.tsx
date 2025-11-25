import React from 'react'
import EventCard from './EventCard'

interface Event {
  id: string
  title: string
  date?: string
  location?: string
  promoted?: boolean
}

interface EventGridProps {
  events: Event[]
  loading?: boolean
  error?: string
  emptyMessage?: string
  className?: string
}

export default function EventGrid({
  events,
  loading = false,
  error,
  emptyMessage = "No events found.",
  className = ''
}: EventGridProps) {
  const interleavePromoted = (list: Event[]) => {
    const promoted = list.filter(e => e.promoted)
    const regular = list.filter(e => !e.promoted)
    if (!promoted.length) return list
    const result: Event[] = []
    let pIndex = 0
    regular.forEach((evt, idx) => {
      // insert a promoted event at the start and then every 4 items if available
      if ((idx === 0 || idx % 4 === 0) && pIndex < promoted.length) {
        result.push(promoted[pIndex++])
      }
      result.push(evt)
    })
    while (pIndex < promoted.length) {
      result.push(promoted[pIndex++])
    }
    return result
  }

  const displayEvents = interleavePromoted(events)

  if (loading) {
    return (
      <div className={`event-grid-loading ${className}`}>
        <div className="loading-spinner" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--gray-200)',
            borderTop: '4px solid var(--primary-blue)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`event-grid-error ${className}`}>
        <div className="text-center" style={{ color: 'var(--error-red)', padding: '2rem' }}>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={`event-grid-empty ${className}`}>
        <div className="text-center" style={{ color: 'var(--gray-600)', padding: '2rem' }}>
          <p>{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`event-grid ${className}`}>
      {displayEvents.map((event) => (
        <EventCard
          key={event.id}
          id={event.id}
          title={event.title}
          date={event.date}
          location={event.location}
          promoted={event.promoted}
        />
      ))}
    </div>
  )
}
