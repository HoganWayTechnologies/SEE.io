import React from 'react'
import { Link } from 'react-router-dom'
import { UserNotification } from '../services/api'

export default function NotificationItem({
  notification,
  onMarkRead,
  linkTo
}: {
  notification: UserNotification
  onMarkRead?: (id: string) => void
  linkTo?: string | null
}) {
  const title = notification.title || notification.reason || 'Notification'
  const message = notification.message || (notification as any).body || notification.reason || ''
  const timestamp = notification.createdAt || (notification as any).date || ''
  return (
    <div style={{ padding: '0.85rem 0', borderBottom: '1px solid var(--gray-100)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
        <div>
          {linkTo ? (
            <Link to={linkTo} className="nav-link" style={{ fontWeight: 600 }}>
              {title}
            </Link>
          ) : (
            <strong>{title}</strong>
          )}
          {notification.read === false && (
            <span className="badge badge-open" style={{ marginLeft: '0.5rem' }}>Unread</span>
          )}
        </div>
        <span style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{timestamp}</span>
      </div>
      {message && (
        <p style={{ margin: '0.35rem 0 0', color: 'var(--gray-700)' }}>
          {linkTo ? <Link to={linkTo} className="nav-link">{message}</Link> : message}
        </p>
      )}
      {onMarkRead && notification.read === false && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: '0.6rem' }}
          onClick={() => onMarkRead(notification.id)}
        >
          Mark as read
        </button>
      )}
    </div>
  )
}
