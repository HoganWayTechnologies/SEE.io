import React, { useEffect, useMemo, useState } from 'react'
import SiteNav from '../components/SiteNav'
import NotificationInbox from '../components/NotificationInbox'
import { useAuth } from '../context/AuthContext'
import { api, getUserIdFromProfile, UserNotification } from '../services/api'

const resolveTab = (notification: UserNotification) => {
  const blob = `${notification.reason || ''} ${notification.title || ''} ${notification.message || ''}`.toLowerCase()
  if (blob.includes('payout') || blob.includes('payment')) return 'Payouts'
  if (blob.includes('reminder') || blob.includes('follow up')) return 'Reminders'
  if (blob.includes('event') || blob.includes('ticket') || blob.includes('share') || blob.includes('rsvp')) return 'Event Activity'
  return 'All'
}

const buildNotificationLink = (notification: any) => {
  const eventId = notification.eventId || notification.EventId || notification.event?.id || notification.event?.eventId
  if (eventId) return `/publisher/events/${eventId}`
  return null
}

export default function PublisherNotificationsPage() {
  const auth = useAuth()
  const [status, setStatus] = useState<string | null>('Loading notifications…')
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [activeTab, setActiveTab] = useState('All')

  useEffect(() => {
    const load = async () => {
      const userId = getUserIdFromProfile(auth.profile)
      if (!auth.idToken || !userId) {
        setStatus('Sign in to view your notifications.')
        setNotifications([])
        return
      }
      try {
        const resp = await api.fetchNotifications(userId, auth.idToken)
        setNotifications(resp || [])
        setStatus(null)
      } catch (err: any) {
        setNotifications([])
        setStatus(err?.message || 'Unable to load notifications')
      }
    }
    load()
  }, [auth.idToken, auth.profile])

  const filtered = useMemo(() => {
    if (activeTab === 'All') return notifications
    if (activeTab === 'Unread') return notifications.filter(note => note.read === false)
    return notifications.filter(note => resolveTab(note) === activeTab)
  }, [notifications, activeTab])

  const handleMarkRead = async (id: string) => {
    const userId = getUserIdFromProfile(auth.profile)
    if (!auth.idToken || !userId) return
    try {
      await api.markNotificationRead(userId, id, auth.idToken)
      setNotifications(prev => prev.map(note => (note.id === id ? { ...note, read: true } : note)))
    } catch (err: any) {
      setStatus(err?.message || 'Unable to mark notification as read.')
    }
  }

  return (
    <div>
      <SiteNav
        activePath="/publisher/notifications"
        links={[
          { to: '/publisher', label: 'Dashboard' },
          { to: '/publisher/events', label: 'Events' },
          { to: '/publisher/analytics', label: 'Analytics' },
          { to: '/publisher/notifications', label: 'Notifications' }
        ]}
      />

      <div className="container" style={{ padding: '2.5rem 0', maxWidth: '820px' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>Notifications</h1>
          <p style={{ color: 'var(--gray-600)' }}>Stay on top of event activity, reminders, and payouts.</p>
        </header>

        <NotificationInbox
          notifications={filtered}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onMarkRead={handleMarkRead}
          status={status}
          linkResolver={buildNotificationLink}
        />
      </div>
    </div>
  )
}
