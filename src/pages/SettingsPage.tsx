import React from 'react'

const notificationOptions = [
  { label: 'Email me when events I follow are updated', key: 'followedUpdates', enabled: true },
  { label: 'Email me weekly personalized recommendations', key: 'weeklyDigest', enabled: false },
  { label: 'Notify me about organizer toolkit tips', key: 'organizerTips', enabled: true }
]

export default function SettingsPage() {
  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <a href="/" className="nav-brand">SEE.io</a>
          <div className="nav-links">
            <a href="/discover" className="nav-link">Discover</a>
            <a href="/profile" className="nav-link">Profile</a>
            <a href="/settings" className="nav-link active">Settings</a>
            <a href="/preferences" className="nav-link">Preferences</a>
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0', maxWidth: '720px' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Account Settings</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Eventually this form will drive `/v1/users/{id}`, `/v1/users/{id}/preferences`, Socxal `/api/Auth/update-profile`,
            and session endpoints for password/email changes. For now, it's illustrative.
          </p>
        </header>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 className="card-title">Profile Details</h3>
            <form style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="form-label">Display Name</label>
                <input className="form-input" defaultValue="Jordan Daniels" />
              </div>
              <div>
                <label className="form-label">Contact Email</label>
                <input className="form-input" defaultValue="jordan@example.com" />
              </div>
              <div>
                <label className="form-label">Phone (optional)</label>
                <input className="form-input" placeholder="+1 (555) 010-2030" />
              </div>
              <button className="btn btn-primary" type="button">Save Changes</button>
            </form>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 className="card-title">Notifications</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {notificationOptions.map(option => (
                <li key={option.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <span>{option.label}</span>
                  <label className="switch">
                    <input type="checkbox" defaultChecked={option.enabled} />
                    <span className="slider" />
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Security</h3>
            <p>Use Socxal `/api/Auth/signIn`, `/api/Auth/reset-password`, and Firebase session endpoints to power these actions.</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" type="button">Change Password</button>
              <button className="btn btn-secondary" type="button">Enable MFA</button>
              <button className="btn btn-secondary" type="button">Review Login History</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
