import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import EventGrid from '../components/EventGrid'
import Seo from '../components/Seo'
import Footer from '../components/Footer'
import { api, Event, formatEventsForDisplay } from '../services/api'
import { useAuth } from '../context/AuthContext'
import SiteNav from '../components/SiteNav'

interface LocationState {
  category?: {
    id?: string
    name: string
  }
}

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const location = useLocation()
  const auth = useAuth()
  const navigationState = (location.state || {}) as LocationState
  const [categoryName, setCategoryName] = useState<string>(navigationState?.category?.name || decodeURIComponent(categoryId || ''))
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const userId = useMemo(() => auth.profile?.uid || auth.profile?.id || auth.profile?.userId || auth.profile?.localId, [auth.profile])

  useEffect(() => {
    if (categoryName) return
    const fetchCategoryName = async () => {
      try {
        const resp = await api.fetchCategories()
        const match = resp?.find?.((cat: any) => (cat.id || cat.name) === decodeURIComponent(categoryId || ''))
        if (match) setCategoryName(match.name || match.id || 'Category')
      } catch {
        setCategoryName('Category')
      }
    }
    fetchCategoryName()
  }, [categoryId, categoryName])

  useEffect(() => {
    const load = async () => {
      if (!categoryId) return
      try {
        setLoading(true)
        setError(null)
        setStatusMsg(null)
        let preferencesStatus = 'active,planning'
        try {
          if (userId && auth.idToken) {
            const prefs = await api.fetchUserPreferences(userId, auth.idToken)
            if (prefs.status) preferencesStatus = prefs.status
          }
        } catch {
          setStatusMsg('Using default filters. Sign in to personalize results.')
        }
        const response = await api.searchEvents({
          category: decodeURIComponent(categoryId),
          status: preferencesStatus,
          take: 30,
          enableDiscovery: true
        })
        setEvents(formatEventsForDisplay(response.items || []))
      } catch (err) {
        console.error('Failed to load category events', err)
        setEvents([])
        setError('Unable to load events for this category right now.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [categoryId, userId, auth.idToken])

  return (
    <div>
      <Seo
        title={categoryName ? `${categoryName} Events` : 'Category Events'}
        description={`Browse upcoming ${categoryName || 'local'} events on SEE.io.`}
        canonical={`${SITE_URL}/categories/${categoryId}`}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${categoryName || 'Category'} Events | SEE.io`,
          url: `${SITE_URL}/categories/${categoryId}`
        }}
      />
      <SiteNav
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/saved', label: 'Saved' }
        ]}
      />

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <p style={{ color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
            <Link to="/discover" className="nav-link" style={{ padding: 0 }}>← Back to Discover</Link>
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{categoryName || 'Category'}</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Events curated just for fans of {categoryName || 'this category'}.
          </p>
        </header>

        <section className="card">
          <div className="card-body">
            <EventGrid
              events={events}
              loading={loading}
              error={error || undefined}
              emptyMessage="No events available right now. Check back soon!"
            />
            {statusMsg && <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>{statusMsg}</p>}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
