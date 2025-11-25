import React from 'react'
import { Link } from 'react-router-dom'

type Props = { id: string; title: string; date?: string; location?: string; promoted?: boolean }

export default function EventCard({ id, title, date, location, promoted }: Props) {
  return (
    <Link to={`/event/${id}`} className="event-card">
      <div className="event-card-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <h3 className="event-card-title" style={{ margin: 0 }}>{title}</h3>
          {promoted && <span className="badge badge-promoted">Promoted</span>}
        </div>
        {date && <p className="event-card-date">{date}</p>}
        {location && <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>{location}</p>}
      </div>
    </Link>
  )
}
