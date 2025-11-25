import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import EventGrid from '../components/EventGrid'
import HomeDiscover from '../components/HomeDiscover'
import Section from '../components/Section'
import SectionHeader from '../components/SectionHeader'
import UserMenu from '../components/UserMenu'
import NotificationBell from '../components/NotificationBell'
import { api, Event, formatEventsForDisplay } from '../services/api'

export default function Home() {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFeaturedEvents = async () => {
      try {
        setLoading(true)
        const response = await api.searchEvents({ take: 6 })
        const formattedEvents = formatEventsForDisplay(response.items || [])
        setFeaturedEvents(formattedEvents)
      } catch (err) {
        console.error('Failed to load featured events:', err)
        // In production, do not silently fall back to mock data—surface the issue
        setFeaturedEvents([])
        setError('Events failed to load. Please retry or check API availability.')
      } finally {
        setLoading(false)
      }
    }

    loadFeaturedEvents()
  }, [])

  return (
    <div>
      {/* Navigation */}
      <nav className="nav">
        <div className="container nav-container">
          <Link to="/" className="nav-brand">SEE.io</Link>
          <div className="nav-links">
          <Link to="/discover" className="nav-link">Discover</Link>
          <Link to="/saved" className="nav-link">Saved</Link>
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>Discover Amazing Events Near You</h1>
          <p>Find and attend the best events in your area. From concerts to workshops, we've got you covered.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/discover" className="btn btn-primary">Browse Events</Link>
            <Link to="/auth" className="btn btn-secondary">Create Event</Link>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <Section>
        <div className="container">
          <SectionHeader
            title="Top Events"
            subtitle="Don't miss out on these popular events happening soon"
          />
          <EventGrid
            events={featuredEvents}
            loading={loading}
            error={error || undefined}
            emptyMessage="No featured events available at the moment."
          />
        </div>
      </Section>

      {/* Nearby Events */}
      <Section backgroundColor="var(--light-purple)">
        <div className="container">
          <SectionHeader
            title="Events Near You"
            subtitle="Discover what's happening in your area"
          />
          <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card-body">
              <HomeDiscover />
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer style={{ backgroundColor: 'var(--gray-900)', color: 'var(--white)', padding: '2rem 0', marginTop: '4rem' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <p>&copy; 2025 SEE.io. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
