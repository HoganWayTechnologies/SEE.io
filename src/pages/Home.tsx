import React, { useState, useEffect } from 'react'
import EventGrid from '../components/EventGrid'
import HomeDiscover from '../components/HomeDiscover'
import Section from '../components/Section'
import SectionHeader from '../components/SectionHeader'
import { api, Event, formatEventsForDisplay } from '../services/api'

export default function Home() {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFeaturedEvents = async () => {
      try {
        setLoading(true)
        // Try to get featured/popular events from API
        const response = await api.searchEvents({ take: 6 })
        const formattedEvents = formatEventsForDisplay(response.items || [])
        setFeaturedEvents(formattedEvents)
      } catch (err) {
        console.error('Failed to load featured events:', err)
        // Fallback to mock data if API fails
        setFeaturedEvents([
          { id: 'demo-1', title: 'Summer Music Festival 2025', date: 'Dec 15, 2025', location: 'Central Park' },
          { id: 'demo-2', title: 'Tech Conference 2025', date: 'Jan 20, 2026', location: 'Convention Center' },
          { id: 'demo-3', title: 'Art Exhibition Opening', date: 'Nov 25, 2025', location: 'Modern Art Museum' },
          { id: 'demo-4', title: 'Food & Wine Festival', date: 'Dec 8, 2025', location: 'Downtown Plaza' },
          { id: 'demo-5', title: 'Comedy Night Special', date: 'Nov 30, 2025', location: 'Laugh Factory' },
          { id: 'demo-6', title: 'Photography Workshop', date: 'Dec 12, 2025', location: 'Community Center' }
        ])
        setError('Using demo data - API unavailable')
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
          <a href="/" className="nav-brand">SEE.io</a>
          <div className="nav-links">
            <a href="/discover" className="nav-link">Discover</a>
            <a href="/auth" className="btn btn-primary">Sign In</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>Discover Amazing Events Near You</h1>
          <p>Find and attend the best events in your area. From concerts to workshops, we've got you covered.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/discover" className="btn btn-primary">Browse Events</a>
            <a href="/auth" className="btn btn-secondary">Create Event</a>
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
