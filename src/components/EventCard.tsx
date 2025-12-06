import React from 'react'
import { Link } from 'react-router-dom'

type Props = {
  id: string
  title: string
  date?: string
  time?: string
  location?: string
  promoted?: boolean
  category?: string
  admissionType?: string
  hostName?: string | null
  businessId?: string | null
  businessSlug?: string | null
}

export default function EventCard({
  id,
  title,
  date,
  time,
  location,
  promoted,
  category,
  admissionType,
  hostName,
  businessId,
  businessSlug
}: Props) {
  const businessPagePath = businessSlug
    ? `/business/${businessSlug}`
    : businessId
      ? `/business/${businessId}`
      : null
  return (
    <Link to={`/event/${id}`} className="event-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="event-card-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {category && (
              <span className="chip chip-small" style={{ textTransform: 'capitalize' }}>
                {category}
              </span>
            )}
            {admissionType && (
              <span className="chip chip-small chip-outline">
                {admissionType === 'open' ? 'Open Admission' : admissionType.replace('_', ' ')}
              </span>
            )}
          </div>
          {promoted && <span className="badge badge-promoted">Promoted</span>}
        </div>
        <h3 className="event-card-title" style={{ margin: '0.35rem 0 0 0' }}>{title}</h3>
        {date && (
          <p className="event-card-date" style={{ margin: '0.25rem 0', color: 'var(--gray-700)' }}>
            {date}
            {time ? ` · ${time}` : null}
          </p>
        )}
        {location && (
          <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', margin: '0' }}>
            {location}
          </p>
        )}
        {hostName && (
          <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', margin: 0 }}>
            Hosted by{' '}
            {businessPagePath ? (
              <Link
                to={businessPagePath}
                onClick={(e) => e.stopPropagation()}
                style={{ color: 'var(--primary-blue)' }}
              >
                {hostName}
              </Link>
            ) : (
              hostName
            )}
          </p>
        )}
      </div>
    </Link>
  )
}
