import React from 'react'

const mockReports = [
  { id: 'rep-120', event: 'Late Night Soundclash', status: 'Open', reason: 'Inappropriate content', created: 'Nov 6, 2025' },
  { id: 'rep-121', event: 'City Park Picnic', status: 'Reviewing', reason: 'Spam listing', created: 'Nov 15, 2025' },
  { id: 'rep-122', event: 'Lightning Hackathon', status: 'Resolved', reason: 'Ticketing issue', created: 'Nov 18, 2025' }
]

export default function ReportsPage() {
  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <a href="/" className="nav-brand">SEE.io</a>
          <div className="nav-links">
            <a href="/discover" className="nav-link">Discover</a>
            <a href="/reports" className="nav-link active">Reports</a>
            <a href="/publisher" className="nav-link">Publisher Console</a>
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Reports & Moderation</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Tie this page into SEE `/v1/public/reports`, `/v1/admin/reports`, `/v1/admin/events/{id}`, and `/v1/admin/reports/{id}` for triage workflows.
          </p>
        </header>

        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 className="card-title">Submit a Report</h3>
            <form style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="form-label">Event URL or ID</label>
                <input className="form-input" placeholder="https://see.io/event/xyz" />
              </div>
              <div>
                <label className="form-label">Reason</label>
                <select className="form-input">
                  <option>Spam or Scam</option>
                  <option>Incorrect Information</option>
                  <option>Inappropriate Content</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Details</label>
                <textarea className="form-input" rows={4} placeholder="Describe the issue..." />
              </div>
              <button className="btn btn-primary" type="button">Submit Report</button>
            </form>
          </div>
        </section>

        <section className="card">
          <div className="card-body">
            <h3 className="card-title">Recent Reports</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ padding: '0.5rem 0' }}>ID</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {mockReports.map(report => (
                  <tr key={report.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.75rem 0' }}>{report.id}</td>
                    <td>{report.event}</td>
                    <td><span className={`badge badge-${report.status.toLowerCase()}`}>{report.status}</span></td>
                    <td>{report.reason}</td>
                    <td>{report.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
