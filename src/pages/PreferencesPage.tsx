import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, UserPreferences } from '../services/api'
import { useAuth } from '../context/AuthContext'
import SiteNav from '../components/SiteNav'

type CategoryOption = { name: string; followed: boolean }
type LocationOption = { label: string; city: string; radiusKm: number }

export default function PreferencesPage() {
  const auth = useAuth()
  const userId = useMemo(() => auth.profile?.uid || auth.profile?.id || auth.profile?.userId || auth.profile?.localId, [auth.profile])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [newLocation, setNewLocation] = useState<LocationOption>({ label: '', city: '', radiusKm: 50 })
  const [enableDiscovery, setEnableDiscovery] = useState(true)
  const [includePlanning, setIncludePlanning] = useState(true)

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      let catData: CategoryOption[] = []
      try {
        const resp = await api.fetchCategories()
        if (Array.isArray(resp)) {
          catData = resp.map((cat: any) => ({
            name: cat.name || cat,
            followed: false
          }))
          setCategories(catData)
        }
      } catch (err) {
        setStatus('Using mock categories until SEE categories endpoint is reachable.')
      }

      if (userId && auth.idToken) {
        try {
          const prefs = await api.fetchUserPreferences(userId, auth.idToken)
          if (prefs.categories && prefs.categories.length) {
            const merged = (catData.length ? catData : categories).map(cat => ({
              ...cat,
              followed: prefs.categories?.includes(cat.name)
            }))
            setCategories(merged)
          }
          if (prefs.locations) {
            setLocations(prefs.locations.map(loc => ({
              label: loc.label || loc.city,
              city: loc.city,
              radiusKm: loc.radiusKm || 50
            })))
          }
          if (typeof prefs.enableDiscovery === 'boolean') setEnableDiscovery(prefs.enableDiscovery)
          if (prefs.status) setIncludePlanning(prefs.status.includes('planning'))
        } catch (err) {
          setStatus((existing) => existing || 'Unable to load saved preferences.')
        }
      }
      setLoading(false)
    }
    loadAll()
  }, [auth.idToken, userId])

  const toggleCategory = (name: string) => {
    setCategories(prev => prev.map(cat => cat.name === name ? { ...cat, followed: !cat.followed } : cat))
  }

  const addLocation = () => {
    if (!newLocation.label || !newLocation.city) return
    setLocations(prev => [...prev, newLocation])
    setNewLocation({ label: '', city: '', radiusKm: 50 })
  }

  const savePreferences = async () => {
    if (!userId || !auth.idToken) {
      setSaveStatus('Sign in to save preferences.')
      return
    }
    const payload: UserPreferences = {
      categories: categories.filter(cat => cat.followed).map(cat => cat.name),
      locations,
      enableDiscovery,
      status: includePlanning ? 'active,planning' : 'active'
    }
    try {
      setSaveStatus('Saving...')
      await api.updateUserPreferences(userId, auth.idToken, payload)
      setSaveStatus('Preferences saved.')
    } catch (err: any) {
      setSaveStatus(err?.message || 'Failed to save preferences')
    }
  }

  if (!auth.isReady) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <p>Loading your preferences…</p>
      </div>
    )
  }

  if (!auth.idToken || !auth.profile) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Sign in to manage your preferences.</h1>
        <Link to="/auth" className="btn btn-primary">Sign In</Link>
      </div>
    )
  }

  return (
    <div>
      <SiteNav
        activePath="/preferences"
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/profile', label: 'Profile' },
          { to: '/settings', label: 'Settings' },
          { to: '/preferences', label: 'Preferences' },
          { to: '/saved', label: 'Saved' },
          { to: '/tickets', label: 'My Tickets' }
        ]}
      />

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem', maxWidth: '720px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Event Preferences</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Choose the categories and locations that shape your SEE.io recommendations.
          </p>
        </header>

        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 className="card-title">Favorite Categories</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {(loading && !categories.length) && <p>Loading categories…</p>}
              {categories.map(category => (
                <button
                  key={category.name}
                  className={`chip ${category.followed ? 'chip-active' : ''}`}
                  type="button"
                  onClick={() => toggleCategory(category.name)}
                >
                  {category.name}
                </button>
              ))}
            </div>
            {status && <p style={{ marginTop: '0.5rem', color: 'var(--gray-600)' }}>{status}</p>}
          </div>
        </section>

        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 className="card-title">Saved Locations</h3>
            {locations.length === 0 && <p style={{ color: 'var(--gray-600)' }}>No saved locations yet.</p>}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {locations.map((location, idx) => (
                <li key={`${location.label}-${idx}`} style={{ padding: '1rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ fontWeight: 600 }}>{location.label}</div>
                  <div style={{ color: 'var(--gray-600)' }}>{location.city} · Within {location.radiusKm}km</div>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <input className="form-input" placeholder="Label" value={newLocation.label} onChange={(e) => setNewLocation(prev => ({ ...prev, label: e.target.value }))} />
              <input className="form-input" placeholder="City" value={newLocation.city} onChange={(e) => setNewLocation(prev => ({ ...prev, city: e.target.value }))} />
              <input className="form-input" type="number" min={1} placeholder="Radius km" value={newLocation.radiusKm} onChange={(e) => setNewLocation(prev => ({ ...prev, radiusKm: Number(e.target.value) }))} style={{ width: '120px' }} />
              <button className="btn btn-secondary" type="button" onClick={addLocation}>Add Location</button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-body">
            <h3 className="card-title">Discovery Toggles</h3>
            <p>Map to query params like `enableDiscovery`, `forceDiscover`, and `status` when hitting `/v1/events`.</p>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <label className="switch-row">
                <span>Include discovery events when SEE has low coverage</span>
                <label className="switch">
                  <input type="checkbox" checked={enableDiscovery} onChange={(e) => setEnableDiscovery(e.target.checked)} />
                  <span className="slider" />
                </label>
              </label>
              <label className="switch-row">
                <span>Show planning & draft events</span>
                <label className="switch">
                  <input type="checkbox" checked={includePlanning} onChange={(e) => setIncludePlanning(e.target.checked)} />
                  <span className="slider" />
                </label>
              </label>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" type="button" onClick={savePreferences}>Save Preferences</button>
            </div>
            {saveStatus && <p style={{ marginTop: '0.5rem', color: 'var(--gray-600)' }}>{saveStatus}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
