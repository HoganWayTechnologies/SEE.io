import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import UserMenu from '../components/UserMenu'
import EventGrid from '../components/EventGrid'
import { api, Event, formatEventsForDisplay, getUserIdFromProfile } from '../services/api'
import { useAuth } from '../context/AuthContext'

const mockSaved: Event[] = [
  { id: 'save-1', title: 'Sunset Rooftop Sessions', date: 'Dec 12, 2025', location: 'Austin, TX', category: 'Music' },
  { id: 'save-2', title: 'React Summit', date: 'Jan 5, 2026', location: 'Seattle, WA', category: 'Tech' },
  { id: 'save-3', title: 'Food Truck Fiesta', date: 'Dec 20, 2025', location: 'Portland, OR', category: 'Food & Drink' }
]

export default function SavedPage() {
  const auth = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    const loadSaved = async () => {
      setLoading(true)
      const userId = getUserIdFromProfile(auth.profile)
      if (!auth.idToken || !userId) {
        setEvents(mockSaved)
        setStatus('Sign in to see your real saved events.')
        setLoading(false)
        return
      }
      try {
        const resp = await api.fetchUserSaved(userId, auth.idToken)
        const formatted = formatEventsForDisplay(resp.items || resp || [])
        setEvents(formatted.length ? formatted : mockSaved)
        setStatus(formatted.length ? null : 'No saved events yet.')
      } catch (err: any) {
        console.warn('saved events fetch failed', err)
        setEvents(mockSaved)
        setStatus('Unable to load saved events; showing sample cards.')
      } finally {
        setLoading(false)
      }
    }
    loadSaved()
  }, [auth.idToken])

  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <Link to="/" className="nav-brand">SEE.io</Link>
          <div className="nav-links">
            <Link to="/discover" className="nav-link">Discover</Link>
            <Link to="/saved" className="nav-link active">Saved</Link>
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Saved & Reminders</h1>
          <p style={{ color: 'var(--gray-600)' }}>Events you bookmarked to keep on your radar.</p>
        </div>
        {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
        <EventGrid events={events} loading={loading} error={undefined} emptyMessage="No saved events yet." />
      </div>
    </div>
  )
}
