import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import UserMenu from '../components/UserMenu'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../context/AuthContext'
import { api, Event } from '../services/api'
import EventGrid from '../components/EventGrid'

export default function ProfilePage() {
  const auth = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionStatus, setSessionStatus] = useState<string | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [eventsStatus, setEventsStatus] = useState<string | null>(null)

  const userId = useMemo(() => auth.profile?.uid || auth.profile?.id || auth.profile?.userId || auth.profile?.localId, [auth.profile])

  useEffect(() => {
    const loadSessions = async () => {
      if (!userId || !auth.idToken) return
      try {
        const resp = await api.fetchUserSessions(userId, auth.idToken)
        setSessions(resp || [])
        setSessionStatus(resp?.length ? null : 'No active sessions.')
      } catch (err: any) {
        setSessions([])
        setSessionStatus(err?.message || 'Could not load sessions')
      }
    }
    loadSessions()
  }, [userId, auth.idToken])

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const resp = await api.searchEvents({ take: 6, status: 'active' })
        setUpcomingEvents(resp.items || [])
        setEventsStatus(resp.items?.length ? null : 'No featured events right now.')
      } catch (err: any) {
        setUpcomingEvents([])
        setEventsStatus('Could not load events')
      }
    }
    loadEvents()
  }, [])

  if (!auth.idToken || !auth.profile) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Please sign in to view your profile.</h1>
        <Link to="/auth" className="btn btn-primary">Sign In</Link>
      </div>
    )
  }

  const linkedAccounts = [
    { name: 'Socxal', status: 'Linked', lastSync: 'moments ago' }
  ]

  const mockStats = [
    { label: 'Events Attended', value: auth.profile.attendedCount || 0 },
    { label: 'Saved Events', value: auth.profile.savedCount || 0 },
    { label: 'Organized Events', value: auth.profile.organizedCount || 0 }
  ]

  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <Link to="/" className="nav-brand">SEE.io</Link>
          <div className="nav-links">
            <Link to="/discover" className="nav-link">Discover</Link>
            <Link to="/profile" className="nav-link active">Profile</Link>
            <Link to="/settings" className="nav-link">Settings</Link>
            <Link to="/preferences" className="nav-link">Preferences</Link>
            <Link to="/saved" className="nav-link">Saved</Link>
            <Link to="/tickets" className="nav-link">My Tickets</Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Account Overview</h1>
          <p style={{ color: 'var(--gray-600)', maxWidth: '640px' }}>
            View the identity and preference data tied to your SEE.io account.
          </p>
        </header>

        <section className="grid" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Identity</h3>
              <p><strong>Name:</strong> {auth.profile.displayName || 'Unknown'}</p>
              <p><strong>Email:</strong> {auth.profile.email}</p>
              <p><strong>Socxal ID:</strong> {auth.profile.socxalId || auth.profile.uid}</p>
              <p><strong>User ID:</strong> {userId}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Preferences Snapshot</h3>
              <p><strong>Default City:</strong> {auth.profile.defaultCity || 'Not set'}</p>
              <p><strong>Categories:</strong> {(auth.profile.favoriteCategories || []).join(', ') || 'None selected'}</p>
              <p><strong>Linked Accounts:</strong></p>
              <ul>
                {linkedAccounts.map(account => (
                  <li key={account.name}>{account.name} — {account.status} ({account.lastSync})</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Highlights</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {mockStats.map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stat.value}</div>
                    <div style={{ color: 'var(--gray-600)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Active Sessions</h2>
          <div className="card">
            <div className="card-body">
              {sessionStatus && <p style={{ color: 'var(--gray-600)' }}>{sessionStatus}</p>}
              {!sessionStatus && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-200)' }}>
                      <th style={{ padding: '0.5rem 0' }}>Device</th>
                      <th>Location</th>
                      <th>Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session, index) => (
                      <tr key={`${session.device}-${index}`} style={{ borderBottom: index === sessions.length - 1 ? 'none' : '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '0.5rem 0' }}>{session.device || session.userAgent || 'Unknown'}</td>
                        <td>{session.location || 'Unknown'}</td>
                        <td>{session.lastActive || session.lastSeen || 'Unknown'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Upcoming Events</h2>
          {eventsStatus && <p style={{ color: 'var(--gray-600)' }}>{eventsStatus}</p>}
          {!eventsStatus && (
            <EventGrid events={upcomingEvents} loading={false} emptyMessage="No upcoming events." />
          )}
        </section>
      </div>
    </div>
  )
}
