import React from 'react'
import { Link } from 'react-router-dom'

type Props = { id: string; title: string; date?: string; location?: string }

export default function EventCard({ id, title, date, location }: Props) {
  return (
    <Link to={`/event/${id}`} className="event-card">
      <div className="event-card-content">
        <h3 className="event-card-title">{title}</h3>
        {date && <p className="event-card-date">{date}</p>}
        {location && <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>{location}</p>}
      </div>
    </Link>
  )
}
