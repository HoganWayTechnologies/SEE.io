import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import EventGrid from '../components/EventGrid'
import {
  api,
  Event,
  formatEventsForDisplay,
  SearchParams
} from '../services/api'
import CategoryCarousel from '../components/CategoryCarousel'
import AdSlot from '../components/AdSlot'
import Footer from '../components/Footer'
import Seo from '../components/Seo'
import SiteNav from '../components/SiteNav'
import VenueAttributeFilterPanel from '../components/VenueAttributeFilterPanel'
import { VenueAttrKey, isVenueAttrKey } from '../constants/venueAttributes'

type FilterState = {
  category: string
  date: string
  status: string
  enableDiscovery: boolean
  forceDiscover: boolean
  city: string
  state: string
  radiusKm: string
  venue: string
  host: string
  businessId: string
  businessName: string
  attrs: VenueAttrKey[]
  attrsMode: 'any' | 'all'
}

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')

const defaultFilters: FilterState = {
  category: 'All',
  date: '',
  status: 'active,planning',
  enableDiscovery: true,
  forceDiscover: false,
  city: '',
  state: '',
  radiusKm: '50',
  venue: '',
  host: '',
  businessId: '',
  businessName: '',
  attrs: [],
  attrsMode: 'any'
}

export default function Discover() {
  const navigate = useNavigate()
  const [searchParamsUrl] = useSearchParams()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<FilterState>({ ...defaultFilters })
  const [draftFilters, setDraftFilters] = useState<FilterState>({ ...defaultFilters })
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [venueQuery, setVenueQuery] = useState('')
  const [venueResults, setVenueResults] = useState<any[]>([])
  const [venueStatus, setVenueStatus] = useState<string | null>(null)
  const [hostQuery, setHostQuery] = useState('')
  const [hostResults, setHostResults] = useState<any[]>([])
  const [hostStatus, setHostStatus] = useState<string | null>(null)
  const [businessQuery, setBusinessQuery] = useState('')
  const [businessResults, setBusinessResults] = useState<any[]>([])
  const [businessStatus, setBusinessStatus] = useState<string | null>(null)

  const buildSearchParams = (
    overrides: Partial<SearchParams> = {},
    filtersOverride?: FilterState,
    searchOverride?: string
  ): SearchParams => {
    const activeFilters = filtersOverride || filters
    const params: SearchParams = {
      take: 12,
      query: (searchOverride ?? searchInput) || undefined,
      enableDiscovery: activeFilters.enableDiscovery,
      forceDiscover: activeFilters.forceDiscover,
      status: activeFilters.status,
      pageToken: overrides.pageToken
    }
    if (activeFilters.category && activeFilters.category !== 'All') params.category = activeFilters.category
    if (activeFilters.date) params.date = activeFilters.date
    if (activeFilters.city) params.city = activeFilters.city
    if (activeFilters.state) params.state = activeFilters.state
    if (activeFilters.radiusKm) params.radiusKm = Number(activeFilters.radiusKm)
    if (activeFilters.venue) params.venue = activeFilters.venue
    if (activeFilters.host) params.host = activeFilters.host
    if (activeFilters.businessId) params.businessId = activeFilters.businessId
    if (activeFilters.attrs && activeFilters.attrs.length) {
      if (activeFilters.attrsMode === 'all') params.attrsAll = activeFilters.attrs
      else params.attrsAny = activeFilters.attrs
    }
    return { ...params, ...overrides }
  }

  const fetchEvents = async (options: { append?: boolean; pageToken?: string; filtersOverride?: FilterState; searchOverride?: string } = {}) => {
    try {
      setLoading(true)
      const params = buildSearchParams({ pageToken: options.pageToken }, options.filtersOverride, options.searchOverride)
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
    const tagFilter = searchParamsUrl.get('tag') || ''
    const cityParam = searchParamsUrl.get('city') || ''
    const stateParam = searchParamsUrl.get('state') || ''
    const venueParam = searchParamsUrl.get('venue') || ''
    const hostParam = searchParamsUrl.get('host') || ''
    const businessIdParam = searchParamsUrl.get('businessId') || ''
    const businessNameParam = searchParamsUrl.get('businessName') || ''
    const attrsParam = searchParamsUrl.get('attrs') || ''
    const attrsModeParam = searchParamsUrl.get('attrsMode') === 'all' ? 'all' : 'any'
    const parsedAttrs = attrsParam.split(',').map(a => a.trim()).filter(isVenueAttrKey)

    const nextFilters = {
      ...defaultFilters,
      city: cityParam,
      state: stateParam,
      venue: venueParam,
      host: hostParam,
      businessId: businessIdParam,
      businessName: businessNameParam,
      attrs: parsedAttrs as VenueAttrKey[],
      attrsMode: attrsModeParam
    }

    setSearchInput(tagFilter)
    setDraftFilters(nextFilters)
    setFilters(nextFilters)

    fetchEvents({
      filtersOverride: nextFilters,
      searchOverride: tagFilter || undefined
    })
  }, [searchParamsUrl])

  useEffect(() => {
    const playlistIdParam = searchParamsUrl.get('playlistId')
    if (!playlistIdParam) return
    navigate(`/playlists?playlistId=${encodeURIComponent(playlistIdParam)}`)
  }, [navigate, searchParamsUrl])

  // Venue directory lookup
  useEffect(() => {
    let handle: number | null = null
    if (!venueQuery || venueQuery.length < 2) {
      setVenueResults([])
      setVenueStatus(null)
      return
    }
    setVenueStatus('Searching venues…')
    handle = window.setTimeout(async () => {
      try {
        const resp = await api.fetchVenueDirectory(venueQuery, 15)
        const items =
          (Array.isArray((resp as any)?.items) && (resp as any).items) ||
          (Array.isArray((resp as any)?.Items) && (resp as any).Items) ||
          (Array.isArray(resp) ? resp : [])
        setVenueResults(items)
        setVenueStatus(items.length ? null : 'No venues found')
      } catch (err: any) {
        setVenueResults([])
        setVenueStatus(err?.message || 'Unable to load venues')
      }
    }, 250)
    return () => {
      if (handle) window.clearTimeout(handle)
    }
  }, [venueQuery])

  // Host directory lookup
  useEffect(() => {
    let handle: number | null = null
    if (!hostQuery || hostQuery.length < 2) {
      setHostResults([])
      setHostStatus(null)
      return
    }
    setHostStatus('Searching hosts…')
    handle = window.setTimeout(async () => {
      try {
        const resp = await api.fetchHostDirectory(hostQuery, 15)
        const items =
          (Array.isArray((resp as any)?.items) && (resp as any).items) ||
          (Array.isArray((resp as any)?.Items) && (resp as any).Items) ||
          (Array.isArray(resp) ? resp : [])
        setHostResults(items)
        setHostStatus(items.length ? null : 'No hosts found')
      } catch (err: any) {
        setHostResults([])
        setHostStatus(err?.message || 'Unable to load hosts')
      }
    }, 250)
    return () => {
      if (handle) window.clearTimeout(handle)
    }
  }, [hostQuery])

  // Business directory lookup
  useEffect(() => {
    let handle: number | null = null
    if (!businessQuery || businessQuery.length < 2) {
      setBusinessResults([])
      setBusinessStatus(null)
      return
    }
    setBusinessStatus('Searching businesses…')
    handle = window.setTimeout(async () => {
      try {
        const resp = await api.fetchBusinessDirectory(businessQuery, 15)
        const items =
          (Array.isArray((resp as any)?.items) && (resp as any).items) ||
          (Array.isArray((resp as any)?.Items) && (resp as any).Items) ||
          (Array.isArray(resp) ? resp : [])
        setBusinessResults(items)
        setBusinessStatus(items.length ? null : 'No businesses found')
      } catch (err: any) {
        setBusinessResults([])
        setBusinessStatus(err?.message || 'Unable to load businesses')
      }
    }, 250)
    return () => {
      if (handle) window.clearTimeout(handle)
    }
  }, [businessQuery])

  const handleNavSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = buildQueryFromDraft()
    navigate(`/discover${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handleLoadMore = () => {
    if (nextPageToken) {
      fetchEvents({ append: true, pageToken: nextPageToken })
    }
  }

  const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleAttrsChange = (attrs: VenueAttrKey[]) => {
    setDraftFilters(prev => ({ ...prev, attrs }))
  }

  const handleAttrsModeChange = (mode: 'any' | 'all') => {
    setDraftFilters(prev => ({ ...prev, attrsMode: mode }))
  }

  const applyFilters = () => {
    const params = buildQueryFromDraft()
    navigate(`/discover${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const buildQueryFromDraft = () => {
    const params = new URLSearchParams()
    if (searchInput.trim()) params.set('tag', searchInput.trim())
    if (draftFilters.city.trim()) params.set('city', draftFilters.city.trim())
    if (draftFilters.state.trim()) params.set('state', draftFilters.state.trim())
    if (draftFilters.venue.trim()) params.set('venue', draftFilters.venue.trim())
    if (draftFilters.host.trim()) params.set('host', draftFilters.host.trim())
    if (draftFilters.businessId.trim()) {
      params.set('businessId', draftFilters.businessId.trim())
      if (draftFilters.businessName.trim()) params.set('businessName', draftFilters.businessName.trim())
    }
    if (draftFilters.attrs && draftFilters.attrs.length) {
      params.set('attrs', draftFilters.attrs.join(','))
      params.set('attrsMode', draftFilters.attrsMode || 'any')
    }
    return params
  }

  const navSearch = (
    <form className="nav-search-form" onSubmit={handleNavSearchSubmit}>
      <div className="nav-search-field">
        <input
          className="form-input nav-search-input"
          placeholder="Search city, state, or vibe"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button className="nav-search-button" type="submit" aria-label="Search events">
          🔍
        </button>
      </div>
    </form>
  )

  return (
    <div>
      <Seo
        title="Discover Events"
        description="Search SEE.io for concerts, festivals, and community events by playlist, category, and personalized filters."
        canonical={`${SITE_URL}/discover`}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Discover Events | SEE.io',
          url: `${SITE_URL}/discover`,
          about: 'Local events and curated playlists'
        }}
      />
      {/* Navigation */}
      <SiteNav activePath="/discover" searchSlot={navSearch} />

      {/* Page Content */}
      <div className="container" style={{ padding: '2rem 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--primary-blue)', marginBottom: '0.35rem' }}>Live calendar</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--gray-900)' }}>Discover events</h1>
            <p style={{ color: 'var(--gray-600)', fontSize: '1.1rem', marginTop: '0.35rem' }}>
              Use search, filters, or playlists to surface the perfect plan.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-expanded={sidebarOpen}
            aria-controls="discover-sidebar"
          >
            {sidebarOpen ? 'Hide filters' : 'Show filters'}
          </button>
        </div>

        <div className="discover-layout" style={{ gridTemplateColumns: sidebarOpen ? 'minmax(260px, 320px) 1fr' : '1fr' }}>
          {sidebarOpen && (
            <aside id="discover-sidebar" className="discover-sidebar" style={{ position: 'sticky', top: '6rem', alignSelf: 'start' }}>
              <div className="card">
                <div className="card-body">
                  <h3 className="card-title">Filters</h3>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
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
                        <option>Wellness</option>
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
                      <label className="form-label">Status</label>
                      <input
                        className="form-input"
                        value={draftFilters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">City</label>
                      <input
                        className="form-input"
                        value={draftFilters.city}
                        onChange={(e) => handleFilterChange('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">State</label>
                      <input
                        className="form-input"
                        value={draftFilters.state}
                        onChange={(e) => handleFilterChange('state', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Business</label>
                      <input
                        className="form-input"
                        value={draftFilters.businessName}
                        onChange={(e) => {
                          handleFilterChange('businessName', e.target.value)
                          setBusinessQuery(e.target.value)
                        }}
                        placeholder="Search business/organizer"
                      />
                      {businessStatus && <small style={{ color: 'var(--gray-600)' }}>{businessStatus}</small>}
                      {businessResults.length > 0 && (
                        <div className="card" style={{ marginTop: '0.35rem', maxHeight: '160px', overflowY: 'auto' }}>
                          <div className="card-body" style={{ display: 'grid', gap: '0.35rem' }}>
                            {businessResults.map((b: any) => (
                              <button
                                key={b.businessId || b.BusinessId || b.id || b.Id}
                                type="button"
                                className="btn btn-secondary"
                                style={{ textAlign: 'left' }}
                                onClick={() => {
                                  handleFilterChange('businessId', b.businessId || b.BusinessId || b.id || b.Id || '')
                                  handleFilterChange('businessName', b.businessName || b.BusinessName || b.name || b.Name || '')
                                  setBusinessQuery('')
                                  setBusinessResults([])
                                  setBusinessStatus(null)
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>{b.businessName || b.BusinessName || b.name || b.Name || 'Business'}</div>
                                {(b.city || b.City || b.state || b.State) && (
                                  <div style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                                    {[b.city || b.City, b.state || b.State].filter(Boolean).join(', ')}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Venue</label>
                      <input
                        className="form-input"
                        value={draftFilters.venue}
                        onChange={(e) => {
                          handleFilterChange('venue', e.target.value)
                          setVenueQuery(e.target.value)
                        }}
                        placeholder="Search venue"
                      />
                      {venueStatus && <small style={{ color: 'var(--gray-600)' }}>{venueStatus}</small>}
                      {venueResults.length > 0 && (
                        <div className="card" style={{ marginTop: '0.35rem', maxHeight: '160px', overflowY: 'auto' }}>
                          <div className="card-body" style={{ display: 'grid', gap: '0.35rem' }}>
                            {venueResults.map((v: any) => (
                              <button
                                key={v.id || v.venueId || v.Name}
                                type="button"
                                className="btn btn-secondary"
                                style={{ textAlign: 'left' }}
                                onClick={() => {
                                  handleFilterChange('venue', v.name || v.Name || '')
                                  setVenueQuery('')
                                  setVenueResults([])
                                  setVenueStatus(null)
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>{v.name || v.Name || 'Venue'}</div>
                                <div style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                                  {[v.address || v.Address, v.city || v.City, v.state || v.State].filter(Boolean).join(', ')}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Radius (km)</label>
                      <input
                        className="form-input"
                        value={draftFilters.radiusKm}
                        onChange={(e) => handleFilterChange('radiusKm', e.target.value)}
                      />
                    </div>
                    <VenueAttributeFilterPanel
                      value={draftFilters.attrs}
                      onChange={handleAttrsChange}
                      mode={draftFilters.attrsMode}
                      onModeChange={handleAttrsModeChange}
                      onClear={() => handleAttrsChange([])}
                      title="Amenities & Accessibility"
                    />
                    <button className="btn btn-secondary" type="button" onClick={applyFilters}>Apply filters</button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <AdSlot placementId="discover-rail" label="Local highlights" variant="rail" />
              </div>
            </aside>
          )}

          <div style={{ minWidth: 0 }}>
            <CategoryCarousel subhead="Quickly explore events by theme." />

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

            <section style={{ marginTop: '2.5rem' }}>
              <div className="card">
                <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.35rem 0' }}>Need curated vibes?</h3>
                    <p style={{ margin: 0, color: 'var(--gray-600)' }}>
                      Head to the playlists hub for swipeable collections and editorial spotlights.
                    </p>
                  </div>
                  <Link to="/playlists" className="btn btn-primary">Browse playlists</Link>
                </div>
              </div>
            </section>

            <div style={{ marginTop: '2rem' }}>
              <AdSlot placementId="discover-bottom-banner" label="Discover Footer Ad" />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
