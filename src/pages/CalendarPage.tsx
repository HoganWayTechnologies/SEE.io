import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatEventsForDisplay, Event, getUserIdFromProfile } from '../services/api'
import { useAuth } from '../context/AuthContext'
import SiteNav from '../components/SiteNav'

export default function CalendarPage() {
  const auth = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [status, setStatus] = useState<string | null>('Loading events…')

  useEffect(() => {
    const load = async () => {
      const userId = getUserIdFromProfile(auth.profile)
      if (!auth.idToken || !userId) {
        setEvents([])
        setStatus('Sign in to see your calendar.')
        return
      }
      try {
        const resp = await api.fetchUserEvents(userId, auth.idToken, { status: 'active,attending,saved', take: 50 })
        const formatted = formatEventsForDisplay(resp.items || resp || [])
        setEvents(formatted)
        setStatus(formatted.length ? null : 'No upcoming events on your calendar.')
      } catch (err: any) {
        setEvents([])
        setStatus(err?.message || 'Unable to load calendar.')
      }
    }
    load()
  }, [auth.idToken, auth.profile])

  return (
    <div>
      <SiteNav
        activePath="/calendar"
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/calendar', label: 'Calendar' }
        ]}
      />

      <div className="container" style={{ padding: '3rem 0', maxWidth: '900px' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>My Calendar</h1>
          <p style={{ color: 'var(--gray-600)' }}>See your saved and attending events in one place.</p>
        </header>

        <div className="card">
          <div className="card-body">
            {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
            {events.map((item, idx) => (
              <div key={`${item.id}-${idx}`} style={{ padding: '0.75rem 0', borderBottom: idx === events.length - 1 ? 'none' : '1px solid var(--gray-100)' }}>
                <div style={{ fontWeight: 600 }}>{item.title}</div>
                <div style={{ color: 'var(--gray-600)' }}>{item.date} {item.time ? `· ${item.time}` : ''} · {item.location}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
