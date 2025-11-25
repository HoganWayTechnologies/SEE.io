import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UserMenu from '../components/UserMenu'
import { api, UserNotification, getUserIdFromProfile } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function InboxPage() {
  const auth = useAuth()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [status, setStatus] = useState<string | null>('Loading notifications…')

  useEffect(() => {
    const load = async () => {
      const userId = getUserIdFromProfile(auth.profile)
      if (!auth.idToken || !userId) {
        setNotifications([])
        setStatus('Sign in to view your notifications.')
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
  }, [auth.idToken])

  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <Link to="/" className="nav-brand">SEE.io</Link>
          <div className="nav-links">
            <Link to="/discover" className="nav-link">Discover</Link>
            <Link to="/inbox" className="nav-link active">Inbox</Link>
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0', maxWidth: '720px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Notifications</h1>
        <div className="card">
          <div className="card-body">
            {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
            {notifications.map(note => (
              <div key={note.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{note.title || note.reason || 'Notification'}</strong>
                  <span style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>{note.createdAt || note.date || ''}</span>
                </div>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-700)' }}>{note.body || note.message || note.reason || ''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
