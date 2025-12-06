import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EventGrid from '../components/EventGrid'
import HomeDiscover from '../components/HomeDiscover'
import CategoryCarousel from '../components/CategoryCarousel'
import Section from '../components/Section'
import SectionHeader from '../components/SectionHeader'
import AdSlot from '../components/AdSlot'
import Footer from '../components/Footer'
import Seo from '../components/Seo'
import SiteNav from '../components/SiteNav'
import { api, Event, EventPlaylistSummary, formatEventsForDisplay } from '../services/api'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')

const heroStatements = [
  { title: 'Plan nights you brag about', body: 'Browse interactive playlists built for every mood.' },
  { title: 'Find your city’s hidden gems', body: 'SEE curates events beyond the algorithm bubble.' },
  { title: 'Pick a vibe, we’ll handle the plan', body: 'From sunrise yoga to midnight raves, SEE has it.' }
]

const inspiration = [
  { emoji: '🌆', title: 'City lights', body: 'Pop-ups, art walks, rooftop sessions.', tag: 'nightlife' },
  { emoji: '🎸', title: 'Live & loud', body: 'Indie showcases, secret gigs, jazz nights.', tag: 'music' },
  { emoji: '🧘', title: 'Slow mornings', body: 'Yoga flows, maker markets, creative jams.', tag: 'wellness' }
]

export default function Home() {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [featuredError, setFeaturedError] = useState<string | null>(null)
  const [playlists, setPlaylists] = useState<EventPlaylistSummary[]>([])
  const [playlistError, setPlaylistError] = useState<string | null>('Loading playlists…')
  const [quickSearch, setQuickSearch] = useState('')
  const [heroCopy, setHeroCopy] = useState(() => heroStatements[Math.floor(Math.random() * heroStatements.length)])
  const navigate = useNavigate()

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        setPlaylistError('Loading playlists…')
        const resp = await api.fetchEventPlaylists()
        const normalized = resp.items ?? []
        setPlaylists(normalized)
        setPlaylistError(normalized.length ? null : 'Curated playlists are not available yet.')
      } catch (err) {
        console.error('Failed to load playlists', err)
        setPlaylists([])
        setPlaylistError('Unable to load playlists. Try again later.')
      }
    }

    const loadFeaturedEvents = async () => {
      try {
        setLoadingFeatured(true)
        const response = await api.searchEvents({ take: 6 })
        const formattedEvents = formatEventsForDisplay(response.items || [])
        setFeaturedEvents(formattedEvents)
        setFeaturedError(null)
      } catch (err) {
        console.error('Failed to load featured events:', err)
        setFeaturedEvents([])
        setFeaturedError('Events failed to load. Please retry or check API availability.')
      } finally {
        setLoadingFeatured(false)
      }
    }

    loadPlaylists()
    loadFeaturedEvents()
  }, [])

  const prioritizedTitles = ['featured', 'hot', 'weekend']
  const accentColors = ['var(--primary-blue)', '#f97316', '#14b8a6']
  const curatedAccentColors = ['#6366f1', '#ec4899', '#10b981', '#f97316']
  const moodPlaylists = playlists.slice(0, 3)
  const moodIds = new Set(moodPlaylists.map(pl => pl.id))
  const curatedPlaylists = (() => {
    const selectFromPool = (pool: EventPlaylistSummary[]) => {
      const selected: EventPlaylistSummary[] = []
      const used = new Set<string>()
      prioritizedTitles.forEach(keyword => {
        const match = pool.find(
          p => !!p.title && p.title.toLowerCase().includes(keyword) && !used.has(p.id)
        )
        if (match) {
          selected.push(match)
          used.add(match.id)
        }
      })
      pool.forEach((p) => {
        if (selected.length >= 4) return
        if (!used.has(p.id)) {
          selected.push(p)
          used.add(p.id)
        }
      })
      return selected
    }

    const pool = playlists.filter(pl => !moodIds.has(pl.id))
    let selection = selectFromPool(pool)
    if (!selection.length && playlists.length) {
      selection = selectFromPool(playlists)
    }
    return selection.slice(0, 4)
  })()

  return (
    <div>
      <Seo
        title="Discover Amazing Events Near You"
        description="SEE.io curates featured, hot, and weekend events so you can plan your calendar with a swipe."
        canonical={`${SITE_URL}/`}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'SEE.io',
          url: `${SITE_URL}/`,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_URL}/discover?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        }}
      />
      {/* Navigation */}
      <SiteNav activePath="/" />

      {/* Hero Section */}
      <section style={{ background: 'radial-gradient(circle at top, rgba(56,189,248,0.25), transparent 60%)', padding: '4rem 0 3rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.15rem', color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>SEE it. Live it.</p>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.75rem' }}>
              {heroCopy.title}
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--gray-600)', marginBottom: '1.5rem' }}>{heroCopy.body}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                navigate(`/discover?tag=${encodeURIComponent(quickSearch)}`)
              }}
              style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}
            >
              <input
                className="form-input"
                placeholder="Search concerts, markets, block parties..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                style={{ minWidth: '240px', flex: '1', maxWidth: '420px' }}
              />
              <button className="btn btn-primary" type="submit">Find events</button>
            </form>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {inspiration.map(card => (
              <Link
                key={card.title}
                to={`/discover?tag=${encodeURIComponent(card.tag)}`}
                className="card"
                style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(148,163,184,0.2)', textDecoration: 'none', color: 'inherit' }}
              >
                <div className="card-body">
                  <span style={{ fontSize: '1.75rem' }}>{card.emoji}</span>
                  <h3 style={{ margin: '0.5rem 0', fontSize: '1.1rem' }}>{card.title}</h3>
                  <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem' }}>{card.body}</p>
                  <span style={{ fontSize: '0.85rem', color: 'var(--primary-blue)' }}>Open playlist →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mood Playlists */}
      {moodPlaylists.length > 0 && (
        <Section>
          <div className="container">
            <SectionHeader
              title="Choose a vibe"
              subtitle="Tap a curated lane to see events already lined up."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {moodPlaylists.map((playlist, index) => (
                <Link
                  key={`mood-${playlist.id}`}
                  to={`/playlists?playlistId=${encodeURIComponent(playlist.id)}`}
                  className="card"
                  style={{ textDecoration: 'none', color: 'inherit', border: `1px solid rgba(15,23,42,0.1)` }}
                >
                  <div className="card-body">
                    <p style={{ fontSize: '0.85rem', color: accentColors[index % accentColors.length], textTransform: 'uppercase', letterSpacing: '0.08rem' }}>
                      {playlist.title}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: 'var(--gray-600)' }}>
                      {playlist.description || 'Fresh events curated for this mood.'}
                    </p>
                    <span style={{ fontSize: '0.85rem', color: accentColors[index % accentColors.length] }}>View playlist →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Featured Playlists */}
      <Section>
        <div className="container">
          <CategoryCarousel headline="Categories" subhead="Tap a category to see everything coming up." />
          <SectionHeader
            title="Curated spotlights"
            subtitle="Quick looks from our editorial team."
          />
          {curatedPlaylists.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {curatedPlaylists.map((playlist, index) => {
                const accent = curatedAccentColors[index % curatedAccentColors.length]
                return (
                  <Link
                    key={`curated-${playlist.id}`}
                    to={`/playlists?playlistId=${encodeURIComponent(playlist.id)}`}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      borderRadius: '1.25rem',
                      padding: '1.5rem',
                      border: `1px solid ${accent}33`,
                      position: 'relative',
                      overflow: 'hidden',
                      background: 'linear-gradient(120deg, #ffffff 0%, #f8fafc 60%)',
                      boxShadow: '0 25px 45px rgba(15,23,42,0.08)',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease'
                    }}
                    className="spotlight-card-link"
                  >
                    <div style={{ position: 'absolute', inset: '0', background: `radial-gradient(circle at top right, ${accent}22, transparent 60%)`, pointerEvents: 'none' }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <small style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em', color: accent }}>
                        Editorial highlight
                      </small>
                      <h4 style={{ margin: '0.5rem 0', fontSize: '1.15rem', color: 'var(--gray-900)' }}>{playlist.title}</h4>
                      <p style={{ color: 'var(--gray-600)', fontSize: '0.95rem', minHeight: '3.6rem' }}>
                        {playlist.description || 'Recent additions, ready when you are.'}
                      </p>
                      <span style={{ fontSize: '0.9rem', color: accent, fontWeight: 600 }}>Dive in →</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <p style={{ color: 'var(--gray-600)' }}>{playlistError}</p>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Fallback featured grid */}
      {curatedPlaylists.length === 0 && (
        <Section>
          <div className="container">
            <SectionHeader
              title="Top Events"
              subtitle="Don't miss out on these popular events happening soon"
            />
            <EventGrid
              events={featuredEvents}
              loading={loadingFeatured}
              error={featuredError || undefined}
              emptyMessage="No featured events available at the moment."
            />
          </div>
        </Section>
      )}

      {/* Nearby Events */}
      <Section backgroundColor="var(--light-purple)">
        <div className="container">
          <div className="card">
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <SectionHeader
                title="Spark an idea"
                subtitle="Drop a location or vibe, we’ll do the rest."
              />
              <HomeDiscover />
            </div>
          </div>
        </div>
      </Section>

      {/* Persistent banner ad near footer */}
      <div className="container" style={{ marginTop: '2rem' }}>
        <AdSlot placementId="home-bottom-banner" label="SEE.io House Ads" />
      </div>

      {/* Footer */}
      <Footer />

      <style>{`
        .spotlight-card-link:hover {
          transform: translateY(-6px);
          box-shadow: 0 35px 65px rgba(15,23,42,0.16);
        }
      `}</style>
    </div>
  )
}
