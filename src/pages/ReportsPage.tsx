import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, EventReport } from '../services/api'
import { useAuth } from '../context/AuthContext'
import UserMenu from '../components/UserMenu'
import NotificationBell from '../components/NotificationBell'

export default function ReportsPage() {
  const auth = useAuth()
  const [form, setForm] = useState({ eventId: '', reason: 'Spam or Scam', details: '', contactEmail: '' })
  const [submitStatus, setSubmitStatus] = useState<string | null>(null)
  const [reports, setReports] = useState<EventReport[]>([])
  const [reportsStatus, setReportsStatus] = useState<string | null>('Loading reports…')

  useEffect(() => {
    const fetchReports = async () => {
      const idToken = auth.idToken
      if (!idToken) {
        setReportsStatus('Sign in as an admin to view incoming reports.')
        return
      }
      try {
        const resp = await api.fetchAdminReports(idToken)
        setReports(resp)
        setReportsStatus(resp.length ? null : 'No reports yet.')
      } catch (err: any) {
        setReportsStatus(err?.message || 'Failed to load reports')
      }
    }
    fetchReports()
  }, [auth.idToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitStatus('Submitting…')
      await api.submitReport({
        eventId: form.eventId,
        reason: form.reason,
        details: form.details,
        contactEmail: form.contactEmail
      })
      setSubmitStatus('Report submitted. We will review shortly.')
      setForm({ eventId: '', reason: 'Spam or Scam', details: '', contactEmail: '' })
    } catch (err: any) {
      setSubmitStatus(err?.message || 'Failed to submit report')
    }
  }

  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <Link to="/" className="nav-brand">SEE.io</Link>
          <div className="nav-links">
            <Link to="/discover" className="nav-link">Discover</Link>
            <Link to="/reports" className="nav-link active">Reports</Link>
            <Link to="/publisher" className="nav-link">Publisher Console</Link>
            <Link to="/saved" className="nav-link">Saved</Link>
            <Link to="/tickets" className="nav-link">My Tickets</Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Reports & Moderation</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Tie this page into SEE `/v1/public/reports`, `/v1/admin/reports`, `/v1/admin/events/{'{' }id{'}'}`, and `/v1/admin/reports/{'{' }id{'}'}` for triage workflows.
          </p>
        </header>

        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 className="card-title">Submit a Report</h3>
            <form style={{ display: 'grid', gap: '1rem' }} onSubmit={handleSubmit}>
              <div>
                <label className="form-label">Event URL or ID</label>
                <input className="form-input" placeholder="https://see.io/event/xyz" value={form.eventId} onChange={(e) => setForm(prev => ({ ...prev, eventId: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Reason</label>
                <select className="form-input" value={form.reason} onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}>
                  <option>Spam or Scam</option>
                  <option>Incorrect Information</option>
                  <option>Inappropriate Content</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Details</label>
                <textarea className="form-input" rows={4} placeholder="Describe the issue..." value={form.details} onChange={(e) => setForm(prev => ({ ...prev, details: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Contact Email (optional)</label>
                <input className="form-input" placeholder="you@example.com" value={form.contactEmail} onChange={(e) => setForm(prev => ({ ...prev, contactEmail: e.target.value }))} />
              </div>
              <button className="btn btn-primary" type="submit">Submit Report</button>
            </form>
            {submitStatus && <p style={{ marginTop: '0.5rem', color: 'var(--gray-600)' }}>{submitStatus}</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-body">
            <h3 className="card-title">Recent Reports</h3>
            {reportsStatus && <p style={{ color: 'var(--gray-600)' }}>{reportsStatus}</p>}
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
                {reports.map(report => (
                  <tr key={report.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.75rem 0' }}>{report.id}</td>
                    <td>{report.eventId || report.event}</td>
                    <td><span className={`badge badge-${report.status?.toLowerCase?.() || 'open'}`}>{report.status || 'Open'}</span></td>
                    <td>{report.reason}</td>
                    <td>{report.createdAt || report['created']}</td>
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
