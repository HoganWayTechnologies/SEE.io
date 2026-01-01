import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import { isBusiness } from '../utils/roles'

export default function NotificationBell() {
  const { notifications, unreadCount, loading, markAllRead } = useNotifications()
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const inboxPath = isBusiness(auth.profile, auth.primaryBusinessId, auth.businessMemberships)
    ? '/publisher/notifications'
    : '/inbox'

  return (
    <div className="user-menu" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} style={{ marginRight: '0.5rem' }}>
      <div className="bell-icon">
        🔔
        {unreadCount > 0 && <span className="badge badge-active bell-badge">{unreadCount}</span>}
      </div>
      {open && (
        <div className="user-menu-dropdown" style={{ minWidth: '260px' }}>
          <div className="user-menu-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>Notifications</div>
            <button className="user-menu-item" type="button" onClick={markAllRead} style={{ padding: 0, textAlign: 'right', color: 'var(--primary-blue)' }}>
              Mark all read
            </button>
          </div>
          {loading && <div className="user-menu-item">Loading…</div>}
          {!loading && notifications.length === 0 && <div className="user-menu-item">No notifications</div>}
          {!loading && notifications.map(note => (
            <div key={note.id || note.eventId} className="user-menu-item">
              <div style={{ fontWeight: 600 }}>{note.title || note.reason || 'Update'}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{note.message || note.details || note.body}</div>
            </div>
          ))}
          <Link to={inboxPath} className="user-menu-item" style={{ color: 'var(--primary-blue)', fontWeight: 600 }}>
            View inbox
          </Link>
        </div>
      )}
    </div>
  )
}
