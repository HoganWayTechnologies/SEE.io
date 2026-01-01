import React from 'react'
import { UserNotification } from '../services/api'
import NotificationItem from './NotificationItem'

const tabs = ['All', 'Unread', 'Event Activity', 'Reminders', 'Payouts']

export default function NotificationInbox({
  notifications,
  activeTab,
  onTabChange,
  onMarkRead,
  status,
  linkResolver
}: {
  notifications: UserNotification[]
  activeTab: string
  onTabChange: (tab: string) => void
  onMarkRead?: (id: string) => void
  status?: string | null
  linkResolver?: (notification: UserNotification) => string | null
}) {
  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              className={`chip ${activeTab === tab ? 'chip-active' : ''}`}
              onClick={() => onTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
        {!status && notifications.length === 0 && (
          <p style={{ color: 'var(--gray-600)' }}>No notifications yet.</p>
        )}
        {!status && notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            linkTo={linkResolver ? linkResolver(notification) : null}
          />
        ))}
      </div>
    </div>
  )
}
