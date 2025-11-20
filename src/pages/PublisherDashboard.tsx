import React from 'react'

const mockEvents = [
  { id: 'evt-001', title: 'Sunset Rooftop Sessions', status: 'active', date: 'Dec 12, 2025', ticketsSold: 320, views: 1800 },
  { id: 'evt-002', title: 'Community Food Crawl', status: 'planning', date: 'Jan 22, 2026', ticketsSold: 0, views: 420 },
  { id: 'evt-003', title: 'Designers Unplugged', status: 'draft', date: 'TBD', ticketsSold: 0, views: 95 }
]

const mockTasks = [
  'Upload hero image for Sunset Rooftop Sessions',
  'Set ticket allocations for Community Food Crawl',
  'Submit tax form for Designers Unplugged'
]

export default function PublisherDashboard() {
  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <a href="/" className="nav-brand">SEE.io</a>
          <div className="nav-links">
            <a href="/discover" className="nav-link">Discover</a>
            <a href="/publisher" className="nav-link active">Publisher Console</a>
            <a href="/reports" className="nav-link">Reports</a>
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Publisher Dashboard</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Wire up SEE `/v1/publisher/events`, `/v1/publisher/events/{id}`, `/v1/publisher/events/{id}/images`,
            `/v1/publisher/events/{id}/stats`, and `/v1/categories` to power this view.
          </p>
        </header>

        <section className="grid" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Quick Stats</h3>
              <p><strong>Upcoming events:</strong> 5</p>
              <p><strong>Tickets sold this week:</strong> 1,240</p>
              <p><strong>Discovery reach:</strong> +14% vs last week</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Tasks</h3>
              <ul style={{ paddingLeft: '1.25rem' }}>
                {mockTasks.map(task => <li key={task}>{task}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>Your Events</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary">Import from discovery</button>
                  <button className="btn btn-primary">Create event</button>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-200)' }}>
                    <th style={{ padding: '0.5rem 0' }}>Title</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Tickets Sold</th>
                    <th>Views</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mockEvents.map(event => (
                    <tr key={event.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '0.75rem 0' }}>{event.title}</td>
                      <td><span className={`badge badge-${event.status}`}>{event.status}</span></td>
                      <td>{event.date}</td>
                      <td>{event.ticketsSold}</td>
                      <td>{event.views}</td>
                      <td>
                        <a href={`/publisher/events/${event.id}`} className="nav-link">Manage</a>
                      </td>
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
