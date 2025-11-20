import React from 'react'

const mockProfile = {
  displayName: 'Jordan Daniels',
  email: 'jordan@example.com',
  socxalId: 'SOCXAL-19382',
  joined: 'Jan 4, 2024',
  defaultCity: 'Austin, TX',
  favoriteCategories: ['Music', 'Food & Drink', 'Tech'],
  linkedAccounts: [{ name: 'Socxal', status: 'Linked', lastSync: '2 hours ago' }]
}

const mockStats = [
  { label: 'Events Attended', value: 18 },
  { label: 'Saved Events', value: 42 },
  { label: 'Organized Events', value: 3 }
]

const mockSessions = [
  { device: 'Macbook Pro — Safari', location: 'Austin, US', lastActive: 'Now' },
  { device: 'iPhone SEE App', location: 'Austin, US', lastActive: '2 days ago' }
]

export default function ProfilePage() {
  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <a href="/" className="nav-brand">SEE.io</a>
          <div className="nav-links">
            <a href="/discover" className="nav-link">Discover</a>
            <a href="/profile" className="nav-link active">Profile</a>
            <a href="/settings" className="nav-link">Settings</a>
            <a href="/preferences" className="nav-link">Preferences</a>
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Account Overview</h1>
          <p style={{ color: 'var(--gray-600)', maxWidth: '640px' }}>
            This screen will use Socxal `/admin/auth/me`, SEE `/v1/events`, `/v1/users/{id}`, and session endpoints to hydrate the profile.
          </p>
        </header>

        <section className="grid" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Identity</h3>
              <p><strong>Name:</strong> {mockProfile.displayName}</p>
              <p><strong>Email:</strong> {mockProfile.email}</p>
              <p><strong>Socxal ID:</strong> {mockProfile.socxalId}</p>
              <p><strong>Joined SEE:</strong> {mockProfile.joined}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Preferences Snapshot</h3>
              <p><strong>Default City:</strong> {mockProfile.defaultCity}</p>
              <p><strong>Categories:</strong> {mockProfile.favoriteCategories.join(', ')}</p>
              <p><strong>Linked Accounts:</strong></p>
              <ul>
                {mockProfile.linkedAccounts.map(account => (
                  <li key={account.name}>{account.name} — {account.status} ({account.lastSync})</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Highlights</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {mockStats.map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stat.value}</div>
                    <div style={{ color: 'var(--gray-600)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Active Sessions</h2>
          <div className="card">
            <div className="card-body">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-200)' }}>
                    <th style={{ padding: '0.5rem 0' }}>Device</th>
                    <th>Location</th>
                    <th>Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSessions.map((session, index) => (
                    <tr key={session.device} style={{ borderBottom: index === mockSessions.length - 1 ? 'none' : '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '0.5rem 0' }}>{session.device}</td>
                      <td>{session.location}</td>
                      <td>{session.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
