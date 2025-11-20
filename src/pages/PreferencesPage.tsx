import React from 'react'

const mockCategories = [
  { name: 'Music', followed: true },
  { name: 'Food & Drink', followed: true },
  { name: 'Tech', followed: false },
  { name: 'Sports', followed: false },
  { name: 'Art & Culture', followed: true }
]

const mockLocations = [
  { label: 'Home Base', city: 'Austin, TX', radiusKm: 40 },
  { label: 'Travel Watch', city: 'Seattle, WA', radiusKm: 25 }
]

export default function PreferencesPage() {
  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <a href="/" className="nav-brand">SEE.io</a>
          <div className="nav-links">
            <a href="/discover" className="nav-link">Discover</a>
            <a href="/profile" className="nav-link">Profile</a>
            <a href="/settings" className="nav-link">Settings</a>
            <a href="/preferences" className="nav-link active">Preferences</a>
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem', maxWidth: '720px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Event Preferences</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            These controls will eventually integrate with SEE `/v1/categories`, `/v1/users/{id}/preferences`,
            `/v1/events/search`, and `/v1/public/events` to personalize the feed.
          </p>
        </header>

        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 className="card-title">Favorite Categories</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {mockCategories.map(category => (
                <button
                  key={category.name}
                  className={`chip ${category.followed ? 'chip-active' : ''}`}
                  type="button"
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 className="card-title">Saved Locations</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {mockLocations.map(location => (
                <li key={location.label} style={{ padding: '1rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ fontWeight: 600 }}>{location.label}</div>
                  <div style={{ color: 'var(--gray-600)' }}>{location.city} · Within {location.radiusKm}km</div>
                </li>
              ))}
            </ul>
            <button className="btn btn-secondary" style={{ marginTop: '1rem' }} type="button">
              Add Location
            </button>
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
                  <input type="checkbox" defaultChecked />
                  <span className="slider" />
                </label>
              </label>
              <label className="switch-row">
                <span>Show planning & draft events</span>
                <label className="switch">
                  <input type="checkbox" />
                  <span className="slider" />
                </label>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
