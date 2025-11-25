import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import UserMenu from '../components/UserMenu'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

const defaultEvent = {
  title: '',
  description: '',
  category: '',
  startUtc: '',
  endUtc: '',
  city: '',
  state: '',
  venue: ''
}

export default function CreateEventPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(defaultEvent)
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.idToken) {
      setStatus('Sign in with a publisher account to create events.')
      return
    }
    setSubmitting(true)
    setStatus(null)
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        startUtc: form.startUtc,
        endUtc: form.endUtc,
        city: form.city,
        state: form.state,
        venue: form.venue
      }
      const resp = await api.createPublisherEventAuthorized(payload, auth.idToken)
      setStatus('Event submitted for review.')
      setForm(defaultEvent)
      if (resp?.id || resp?.eventId) {
        navigate('/my-events')
      }
    } catch (err: any) {
      setStatus(err?.message || 'Failed to create event')
    } finally {
      setSubmitting(false)
    }
  }

  if (!auth.idToken) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Create Event</h1>
        <p>Sign in with a publisher account to create events.</p>
        <Link to="/auth" className="btn btn-primary">Sign In</Link>
      </div>
    )
  }

  return (
    <div>
      <nav className="nav">
        <div className="container nav-container">
          <Link to="/" className="nav-brand">SEE.io</Link>
          <div className="nav-links">
            <Link to="/discover" className="nav-link">Discover</Link>
            <Link to="/my-events" className="nav-link">My Events</Link>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="container" style={{ padding: '3rem 0', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Create Event</h1>
        <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
          New events are submitted for moderation before they are approved.
        </p>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={(e) => updateField('title', e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={4} value={form.description} onChange={(e) => updateField('description', e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Category</label>
                <input className="form-input" value={form.category} onChange={(e) => updateField('category', e.target.value)} placeholder="Music, Tech, Food, etc." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Start (UTC)</label>
                  <input className="form-input" type="datetime-local" value={form.startUtc} onChange={(e) => updateField('startUtc', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">End (UTC)</label>
                  <input className="form-input" type="datetime-local" value={form.endUtc} onChange={(e) => updateField('endUtc', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Venue</label>
                  <input className="form-input" value={form.venue} onChange={(e) => updateField('venue', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">City</label>
                  <input className="form-input" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
                </div>
                <div style={{ width: '120px' }}>
                  <label className="form-label">State</label>
                  <input className="form-input" value={form.state} onChange={(e) => updateField('state', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link to="/my-events" className="btn btn-secondary">Cancel</Link>
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit for Review'}
                </button>
              </div>
              {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
