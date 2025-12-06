import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EventGrid from '../components/EventGrid'
import AdSlot from '../components/AdSlot'
import Footer from '../components/Footer'
import Seo from '../components/Seo'
import { api, EventPlaylistSummary, Event, formatEventsForDisplay } from '../services/api'
import SiteNav from '../components/SiteNav'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')
const accentColors = ['var(--primary-blue)', '#f97316', '#14b8a6', '#ec4899']

export default function PlaylistsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [playlists, setPlaylists] = useState<EventPlaylistSummary[]>([])
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error' | 'empty'>('loading')
  const [activePlaylist, setActivePlaylist] = useState<EventPlaylistSummary | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [playlistEvents, setPlaylistEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null)
  const [geoStatus, setGeoStatus] = useState<string | null>(null)

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        setListStatus('loading')
        setErrorMessage(null)
        const resp = await api.fetchEventPlaylists()
        const items = resp.items ?? []
        setPlaylists(items)
        if (!items.length) {
          setListStatus('empty')
        } else {
          setListStatus('ready')
        }
      } catch (err) {
        console.error('Failed to load playlists', err)
        setPlaylists([])
        setListStatus('error')
        setErrorMessage('Unable to load playlists right now. Please try again soon.')
      }
    }
    loadPlaylists()
  }, [])

  useEffect(() => {
    if (!playlists.length) {
      setActivePlaylist(null)
      return
    }
    const playlistId = searchParams.get('playlistId')
    if (playlistId) {
      const match = playlists.find(pl => pl.id === playlistId)
      if (match) {
        setActivePlaylist(match)
        return
      }
    }
    setActivePlaylist(prev => prev ?? playlists[0])
  }, [playlists, searchParams])

  useEffect(() => {
    if (!activePlaylist?.requiresLocation) {
      setGeoStatus(null)
      return
    }
    if (geo) return
    setGeoStatus('Requesting location…')
    if (!navigator.geolocation) {
      setGeoStatus('Location required to load this playlist.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setGeoStatus(null)
      },
      () => setGeoStatus('Turn on location to see nearby playlists.'),
      { maximumAge: 60_000 }
    )
  }, [activePlaylist, geo])

  const handleSelect = (playlist: EventPlaylistSummary) => {
    setActivePlaylist(playlist)
    const params = new URLSearchParams(searchParams)
    params.set('playlistId', playlist.id)
    setSearchParams(params)
  }

  useEffect(() => {
    const loadPlaylistEvents = async () => {
      if (!activePlaylist) {
        setPlaylistEvents([])
        return
      }
      try {
        setEventsLoading(true)
        setEventsError(null)
        if (activePlaylist.requiresLocation && !geo) {
          setEventsLoading(false)
          setEventsError(geoStatus || 'Enable location to load this playlist.')
          return
        }
        const resp = await api.fetchEventPlaylist(activePlaylist.id, geo || undefined)
        setPlaylistEvents(formatEventsForDisplay(resp.items || []))
      } catch (err) {
        console.error('Failed to load playlist events', err)
        setPlaylistEvents([])
        setEventsError('Unable to load events for this playlist right now.')
      } finally {
        setEventsLoading(false)
      }
    }
    loadPlaylistEvents()
  }, [activePlaylist])

  const heroDescription = useMemo(() => {
    if (!activePlaylist) return 'Swipe through curated event collections built by our editorial team.'
    return activePlaylist.description || 'Swipe through curated event collections built by our editorial team.'
  }, [activePlaylist])

  return (
    <div>
      <Seo
        title="SEE.io Playlists"
        description="Browse curated SEE.io event playlists and swipe through featured collections."
        canonical={`${SITE_URL}/playlists`}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'SEE.io Playlists',
          url: `${SITE_URL}/playlists`,
          about: 'Curated SEE.io event playlists'
        }}
      />
      <SiteNav activePath="/playlists" />

      <div className="container" style={{ padding: '2.5rem 0', display: 'grid', gap: '2rem' }}>
        <header style={{ textAlign: 'center' }}>
          <p style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>SEE mixtapes</p>
          <h1 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', color: 'var(--gray-900)' }}>Curated playlists</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--gray-600)', maxWidth: '640px', margin: '0 auto' }}>{heroDescription}</p>
        </header>

        {listStatus === 'loading' && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center' }}>Loading playlists…</div>
          </div>
        )}

        {listStatus === 'error' && errorMessage && (
          <div className="card">
            <div className="card-body" style={{ color: 'var(--error-red)' }}>{errorMessage}</div>
          </div>
        )}

        {listStatus === 'empty' && (
          <div className="card">
            <div className="card-body">No playlists are available yet. Check back soon!</div>
          </div>
        )}

        {playlists.length > 0 && (
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'minmax(240px, 320px) 1fr', alignItems: 'start' }}>
            <section className="card" style={{ position: 'sticky', top: '6rem' }}>
              <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
                <h3 style={{ marginTop: 0 }}>Playlists</h3>
                {playlists.map((playlist, index) => {
                  const isActive = activePlaylist?.id === playlist.id
                  return (
                    <button
                      key={playlist.id}
                      onClick={() => handleSelect(playlist)}
                      className="playlist-pill"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: isActive ? `2px solid ${accentColors[index % accentColors.length]}` : '1px solid var(--gray-200)',
                        borderRadius: '0.75rem',
                        padding: '0.85rem 1rem',
                        background: isActive ? 'rgba(59,130,246,0.08)' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{playlist.title}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>→</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              {activePlaylist ? (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
                    <h2 style={{ margin: 0 }}>{activePlaylist.title}</h2>
                    {activePlaylist.description && (
                      <p style={{ margin: 0, color: 'var(--gray-600)' }}>{activePlaylist.description}</p>
                    )}
                    <span style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>
                      {activePlaylist.requiresLocation
                        ? 'Location-enabled mix just for your area.'
                        : 'Browse upcoming events curated for this playlist.'}
                    </span>
                    {geoStatus && <p style={{ color: 'var(--gray-600)' }}>{geoStatus}</p>}
                  </div>
                </div>
              ) : null}

              <EventGrid
                events={playlistEvents}
                loading={eventsLoading}
                error={eventsError || undefined}
                emptyMessage="No events found right now. Check back soon!"
              />

              <div style={{ marginTop: '2rem' }}>
                <AdSlot placementId="playlists-bottom" label="Playlist Sponsor" />
              </div>
            </section>
          </div>
        )}
      </div>

      <Footer />

      <style>{`
        .playlist-pill {
          font: inherit;
          color: inherit;
          background: transparent;
        }
        .playlist-pill:focus {
          outline: 2px solid var(--primary-blue);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}
