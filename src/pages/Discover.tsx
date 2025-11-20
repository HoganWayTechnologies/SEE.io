import React, { useState, useEffect } from 'react'
import EventGrid from '../components/EventGrid'
import { api, Event, formatEventsForDisplay, SearchParams } from '../services/api'

type FilterState = {
  category: string
  date: string
  status: string
  enableDiscovery: boolean
  forceDiscover: boolean
  lat: string
  lon: string
  radiusKm: string
}

const defaultFilters: FilterState = {
  category: 'All',
  date: '',
  status: 'active,planning',
  enableDiscovery: true,
  forceDiscover: false,
  lat: '',
  lon: '',
  radiusKm: '50'
}

export default function Discover() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<FilterState>({ ...defaultFilters })
  const [draftFilters, setDraftFilters] = useState<FilterState>({ ...defaultFilters })
  const [showFilters, setShowFilters] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)

  const buildSearchParams = (
    overrides: Partial<SearchParams> = {},
    filtersOverride?: FilterState
  ): SearchParams => {
    const activeFilters = filtersOverride || filters
    const params: SearchParams = {
      take: 12,
      query: searchInput || undefined,
      enableDiscovery: activeFilters.enableDiscovery,
      forceDiscover: activeFilters.forceDiscover,
      status: activeFilters.status,
      pageToken: overrides.pageToken
    }
    if (activeFilters.category && activeFilters.category !== 'All') params.category = activeFilters.category
    if (activeFilters.date) params.date = activeFilters.date
    if (activeFilters.lat) params.lat = Number(activeFilters.lat)
    if (activeFilters.lon) params.lon = Number(activeFilters.lon)
    if (activeFilters.radiusKm) params.radiusKm = Number(activeFilters.radiusKm)
    return { ...params, ...overrides }
  }

  const fetchEvents = async (options: { append?: boolean; pageToken?: string; filtersOverride?: FilterState } = {}) => {
    try {
      setLoading(true)
      const params = buildSearchParams({ pageToken: options.pageToken }, options.filtersOverride)
      const response = await api.searchEvents(params)
      const formatted = formatEventsForDisplay(response.items || [])
      setEvents(prev => options.append ? [...prev, ...formatted] : formatted)
      setNextPageToken(response.nextPageToken || null)
      setError(null)
    } catch (err) {
      console.error('Failed to load events:', err)
      if (!options.append) setEvents([])
      setError('Could not load events. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchEvents()
  }

  const handleLoadMore = () => {
    if (nextPageToken) {
      fetchEvents({ append: true, pageToken: nextPageToken })
    }
  }

  const openFilters = () => {
    setDraftFilters({ ...filters })
    setShowFilters(true)
  }

  const closeFilters = () => setShowFilters(false)

  const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    const nextFilters = { ...draftFilters }
    setFilters(nextFilters)
    setShowFilters(false)
    fetchEvents({ filtersOverride: nextFilters })
  }

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

      {/* Page Content */}
      <div className="container" style={{ padding: '2rem 0' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
            Discover Events
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: '1.125rem' }}>
            Find the perfect event for you
          </p>
        </div>

        {/* Search + filter controls */}
        <form onSubmit={handleSearchSubmit} className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>Search</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by title, venue, city..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="form-input"
              style={{ flex: 1, minWidth: '220px' }}
            />
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={openFilters}>
              Filters
            </button>
          </div>
        </form>

        {/* Event Grid */}
        <EventGrid
          events={events}
          loading={loading}
          error={error || undefined}
          emptyMessage="No events match your filters. Try adjusting your search criteria."
        />

        {nextPageToken && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={handleLoadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Filters</h3>
              <button className="modal-close" onClick={closeFilters}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={draftFilters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option>All</option>
                  <option>Music</option>
                  <option>Food & Drink</option>
                  <option>Tech</option>
                  <option>Sports</option>
                  <option>Art & Culture</option>
                </select>
              </div>
              <div>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={draftFilters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Status (comma separated)</label>
                <input
                  className="form-input"
                  value={draftFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Latitude</label>
                  <input
                    className="form-input"
                    value={draftFilters.lat}
                    onChange={(e) => handleFilterChange('lat', e.target.value)}
                    placeholder="30.2672"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Longitude</label>
                  <input
                    className="form-input"
                    value={draftFilters.lon}
                    onChange={(e) => handleFilterChange('lon', e.target.value)}
                    placeholder="-97.7431"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Radius (km)</label>
                <input
                  className="form-input"
                  value={draftFilters.radiusKm}
                  onChange={(e) => handleFilterChange('radiusKm', e.target.value)}
                />
              </div>
              <label className="switch-row">
                <span>Enable discovery fallback</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={draftFilters.enableDiscovery}
                    onChange={(e) => handleFilterChange('enableDiscovery', e.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </label>
              <label className="switch-row">
                <span>Force discovery mode</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={draftFilters.forceDiscover}
                    onChange={(e) => handleFilterChange('forceDiscover', e.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </label>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => { setDraftFilters({ ...defaultFilters }); }}>
                Reset
              </button>
              <button className="btn btn-primary" onClick={applyFilters}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
