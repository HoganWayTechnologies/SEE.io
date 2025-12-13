import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import { api, Venue } from '../services/api'
import VenueAttributeFilterPanel from '../components/VenueAttributeFilterPanel'
import { VenueAttrKey, isVenueAttrKey } from '../constants/venueAttributes'

type FilterState = {
  q: string
  city: string
  state: string
  category: string
  radiusKm: string
  take: string
}

const defaultFilters: FilterState = {
  q: '',
  city: '',
  state: '',
  category: '',
  radiusKm: '25',
  take: '24'
}

export default function VenuesPage() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [venues, setVenues] = useState<Venue[]>([])
  const [status, setStatus] = useState<string | null>('Loading venues…')
  const [loading, setLoading] = useState(false)
  const [geoStatus, setGeoStatus] = useState<string | null>(null)
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [attrKeys, setAttrKeys] = useState<VenueAttrKey[]>([])
  const [attrsMode, setAttrsMode] = useState<'any' | 'all'>('any')
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries())
    const nextFilters: FilterState = {
      ...filters,
      q: params.q || '',
      city: params.city || '',
      state: params.state || '',
      category: params.category || '',
      radiusKm: params.radiusKm || filters.radiusKm,
      take: params.take || filters.take
    }
    const attrsParam = params.attrs || ''
    const parsedAttrs = attrsParam.split(',').map(a => a.trim()).filter(isVenueAttrKey)
    const mode = params.attrsMode === 'all' ? 'all' : 'any'
    setFilters(nextFilters)
    setAttrKeys(parsedAttrs as VenueAttrKey[])
    setAttrsMode(mode)
    fetchVenues(nextFilters, undefined, undefined, parsedAttrs as VenueAttrKey[], mode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchVenues = async (overrideFilters?: FilterState, overrideLat?: number | null, overrideLon?: number | null, overrideAttrs?: VenueAttrKey[], overrideMode?: 'any' | 'all') => {
    const activeFilters = overrideFilters || filters
    const activeLat = overrideLat !== undefined ? overrideLat : lat
    const activeLon = overrideLon !== undefined ? overrideLon : lon
    const activeAttrs = overrideAttrs || attrKeys
    const activeMode = overrideMode || attrsMode
    setLoading(true)
    setStatus('Searching venues…')
    try {
      const resp = await api.searchVenues({
        q: activeFilters.q || undefined,
        city: activeFilters.city || undefined,
        state: activeFilters.state || undefined,
        category: activeFilters.category || undefined,
        radiusKm: activeFilters.radiusKm ? Number(activeFilters.radiusKm) : undefined,
        lat: activeLat ?? undefined,
        lon: activeLon ?? undefined,
        take: activeFilters.take ? Number(activeFilters.take) : undefined,
        attrsAny: activeAttrs && activeAttrs.length && activeMode === 'any' ? activeAttrs : undefined,
        attrsAll: activeAttrs && activeAttrs.length && activeMode === 'all' ? activeAttrs : undefined
      })
      const list = resp.items || []
      setVenues(list)
      setStatus(list.length ? null : 'No venues found. Try another search or widen your radius.')
    } catch (err: any) {
      setStatus(err?.message || 'Unable to load venues right now.')
      setVenues([])
    } finally {
      setLoading(false)
    }
  }

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation not supported in this browser.')
      return
    }
    setGeoStatus('Requesting your location…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLon(pos.coords.longitude)
        setGeoStatus('Using your location for better results.')
        fetchVenues(undefined, pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        console.warn('geo error', err)
        setGeoStatus('We could not access your location. You can still search by city.')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters(attrKeys, attrsMode)
  }

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleAttrChange = (next: VenueAttrKey[]) => {
    setAttrKeys(next)
    applyFilters(next, attrsMode)
  }

  const handleClearAttrs = () => {
    setAttrKeys([])
    setAttrsMode('any')
    applyFilters([], 'any')
  }

  const handleModeChange = (mode: 'any' | 'all') => {
    setAttrsMode(mode)
    applyFilters(attrKeys, mode)
  }

  const applyFilters = (nextAttrs: VenueAttrKey[], mode: 'any' | 'all') => {
    const params = new URLSearchParams()
    if (filters.q) params.set('q', filters.q)
    if (filters.city) params.set('city', filters.city)
    if (filters.state) params.set('state', filters.state)
    if (filters.category) params.set('category', filters.category)
    if (filters.radiusKm) params.set('radiusKm', filters.radiusKm)
    if (filters.take) params.set('take', filters.take)
    if (nextAttrs.length) {
      params.set('attrs', nextAttrs.join(','))
      params.set('attrsMode', mode)
    }
    setSearchParams(params)
    fetchVenues(undefined, undefined, undefined, nextAttrs, mode)
  }

  return (
    <div>
      <SiteNav activePath="/venues" />
      <header className="hero" style={{ padding: '3rem 0' }}>
        <div className="container">
          <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>Venues</p>
          <h1 style={{ margin: 0, fontSize: '2.5rem' }}>Find spaces hosting SEE events</h1>
          <p style={{ color: 'var(--gray-600)', maxWidth: 620, margin: '0.5rem auto 2rem' }}>
            Discover nightlife spots, theaters, rooftops, and galleries that host SEE events. Filter by city or vibe and tap in.
          </p>
          <div className="card" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div className="card-body">
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', alignItems: 'end' }}>
                <div>
                  <label className="form-label">Search</label>
                  <input
                    className="form-input"
                    placeholder="Venue name, tag, or neighborhood"
                    value={filters.q}
                    onChange={(e) => updateFilter('q', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">City</label>
                  <input className="form-input" value={filters.city} onChange={(e) => updateFilter('city', e.target.value)} placeholder="Austin" />
                </div>
                <div>
                  <label className="form-label">State</label>
                  <input className="form-input" value={filters.state} onChange={(e) => updateFilter('state', e.target.value)} placeholder="TX" />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <input className="form-input" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)} placeholder="music, comedy…" />
                </div>
                <div>
                  <label className="form-label">Radius (km)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={filters.radiusKm}
                    onChange={(e) => updateFilter('radiusKm', e.target.value)}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search venues'}</button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleUseLocation}
                    disabled={loading}
                  >
                    Use my location
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const defaults = { ...defaultFilters }
                      setFilters(defaults)
                      setLat(null)
                      setLon(null)
                      fetchVenues(defaults, null, null)
                    }}
                  >
                    Reset
                  </button>
                  {geoStatus && <span style={{ color: 'var(--gray-600)' }}>{geoStatus}</span>}
                </div>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: '2rem 0 3rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <VenueAttributeFilterPanel
            value={attrKeys}
            onChange={handleAttrChange}
            mode={attrsMode}
            onModeChange={handleModeChange}
            onClear={handleClearAttrs}
          />
        </div>
        {status && <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>{status}</p>}
        <div className="grid grid-cols-3" style={{ gap: '1.25rem' }}>
          {venues.map(venue => (
            <Link
              to={`/venues/${venue.id}`}
              key={venue.id}
              className="card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              {venue.imageUrl && (
                <div style={{ height: 180, backgroundImage: `url(${venue.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              )}
              <div className="card-body">
                <h3 className="card-title" style={{ marginBottom: '0.35rem' }}>{venue.name}</h3>
                <p style={{ margin: 0, color: 'var(--gray-600)' }}>
                  {[venue.city, venue.state].filter(Boolean).join(', ') || venue.address || 'Location coming soon'}
                </p>
                {venue.tags && venue.tags.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {venue.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="chip chip-small chip-outline">{tag}</span>
                    ))}
                  </div>
                )}
                {venue.categories && venue.categories.length > 0 && (
                  <div style={{ marginTop: '0.35rem', color: 'var(--primary-blue)', fontSize: '0.9rem' }}>
                    {venue.categories.join(', ')}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
