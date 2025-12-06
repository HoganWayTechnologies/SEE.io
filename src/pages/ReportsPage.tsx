import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, EventPlaylistAdminResponse, EventPlaylistUpsertRequest, EventReport } from '../services/api'
import { useAuth } from '../context/AuthContext'
import SiteNav from '../components/SiteNav'

type PlaylistFormState = {
  title: string
  description: string
  query: string
  category: string
  creatorType: string
  sort: string
  maxEvents: number
  daysFromOffset: number
  daysToOffset: number
  radiusKm: string
  includePrivate: boolean
  requiresLocation: boolean
  defaultLat: string
  defaultLon: string
  city: string
  state: string
  enabled: boolean
  displayOrder: number
}

const defaultPlaylistForm: PlaylistFormState = {
  title: '',
  description: '',
  query: '',
  category: '',
  creatorType: '',
  sort: 'rank',
  maxEvents: 20,
  daysFromOffset: 0,
  daysToOffset: 7,
  radiusKm: '',
  includePrivate: false,
  requiresLocation: false,
  defaultLat: '',
  defaultLon: '',
  city: '',
  state: '',
  enabled: true,
  displayOrder: 0
}

export default function ReportsPage() {
  const auth = useAuth()
  const [form, setForm] = useState({ eventId: '', reason: 'Spam or Scam', details: '', contactEmail: '' })
  const [submitStatus, setSubmitStatus] = useState<string | null>(null)
  const [reports, setReports] = useState<EventReport[]>([])
  const [reportsStatus, setReportsStatus] = useState<string | null>('Loading reports…')
  const [adminPlaylists, setAdminPlaylists] = useState<EventPlaylistAdminResponse[]>([])
  const [playlistStatus, setPlaylistStatus] = useState<string | null>('Loading playlists…')
  const [playlistForm, setPlaylistForm] = useState<PlaylistFormState>({ ...defaultPlaylistForm })
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null)
  const [playlistFormStatus, setPlaylistFormStatus] = useState<string | null>(null)

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

  const refreshPlaylists = useCallback(async () => {
    if (!auth.idToken) {
      setPlaylistStatus('Sign in as an admin to manage playlists.')
      return
    }
    try {
      setPlaylistStatus('Loading playlists…')
      const resp = await api.fetchAdminEventPlaylists(auth.idToken)
      setAdminPlaylists(resp || [])
      setPlaylistStatus(resp?.length ? null : 'No playlists configured.')
    } catch (err: any) {
      console.error('Failed to load admin playlists', err)
      setAdminPlaylists([])
      setPlaylistStatus(err?.message || 'Unable to load playlists.')
    }
  }, [auth.idToken])

  useEffect(() => {
    refreshPlaylists()
  }, [refreshPlaylists])

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

  const startNewPlaylist = () => {
    setEditingPlaylistId(null)
    setPlaylistForm({ ...defaultPlaylistForm })
    setPlaylistFormStatus(null)
  }

  const editPlaylist = (playlist: EventPlaylistAdminResponse) => {
    setEditingPlaylistId(playlist.id)
    setPlaylistForm({
      title: playlist.title || '',
      description: playlist.description || '',
      query: playlist.query || '',
      category: playlist.category || '',
      creatorType: playlist.creatorType || '',
      sort: playlist.sort || 'rank',
      maxEvents: playlist.maxEvents ?? 20,
      daysFromOffset: playlist.daysFromOffset ?? 0,
      daysToOffset: playlist.daysToOffset ?? 7,
      radiusKm: playlist.radiusKm != null ? String(playlist.radiusKm) : '',
      includePrivate: Boolean(playlist.includePrivate),
      requiresLocation: Boolean(playlist.requiresLocation),
      defaultLat: playlist.defaultLat != null ? String(playlist.defaultLat) : '',
      defaultLon: playlist.defaultLon != null ? String(playlist.defaultLon) : '',
      city: playlist.city || '',
      state: playlist.state || '',
      enabled: Boolean(playlist.enabled),
      displayOrder: playlist.displayOrder ?? 0
    })
    setPlaylistFormStatus(null)
  }

  const numberOrNull = (value: string | number): number | null => {
    if (value === '' || value === null || value === undefined) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const handlePlaylistFieldChange = (key: keyof PlaylistFormState, value: string | number | boolean) => {
    setPlaylistForm(prev => ({ ...prev, [key]: value } as PlaylistFormState))
  }

  const handlePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.idToken) {
      setPlaylistFormStatus('Sign in to manage playlists.')
      return
    }
    const payload: EventPlaylistUpsertRequest = {
      title: playlistForm.title,
      description: playlistForm.description || null,
      query: playlistForm.query || null,
      category: playlistForm.category || null,
      creatorType: playlistForm.creatorType || null,
      sort: playlistForm.sort || 'rank',
      maxEvents: Number(playlistForm.maxEvents) || 0,
      daysFromOffset: Number(playlistForm.daysFromOffset) || 0,
      daysToOffset: Number(playlistForm.daysToOffset) || 0,
      radiusKm: numberOrNull(playlistForm.radiusKm),
      includePrivate: playlistForm.includePrivate,
      requiresLocation: playlistForm.requiresLocation,
      defaultLat: numberOrNull(playlistForm.defaultLat),
      defaultLon: numberOrNull(playlistForm.defaultLon),
      city: playlistForm.city || null,
      state: playlistForm.state || null,
      enabled: playlistForm.enabled,
      displayOrder: playlistForm.displayOrder ?? 0
    }
    try {
      setPlaylistFormStatus('Saving playlist…')
      let saved: EventPlaylistAdminResponse
      if (editingPlaylistId) {
        saved = await api.updateAdminEventPlaylist(editingPlaylistId, payload, auth.idToken)
      } else {
        saved = await api.createAdminEventPlaylist(payload, auth.idToken)
        setEditingPlaylistId(saved.id)
      }
      setPlaylistFormStatus('Playlist saved.')
      await refreshPlaylists()
      editPlaylist(saved)
    } catch (err: any) {
      setPlaylistFormStatus(err?.message || 'Failed to save playlist.')
    }
  }

  const handleDeletePlaylist = async (id: string) => {
    if (!auth.idToken) return
    if (!window.confirm('Delete this playlist?')) return
    try {
      await api.deleteAdminEventPlaylist(id, auth.idToken)
      setPlaylistFormStatus('Playlist deleted.')
      if (editingPlaylistId === id) {
        startNewPlaylist()
      }
      refreshPlaylists()
    } catch (err: any) {
      setPlaylistFormStatus(err?.message || 'Failed to delete playlist.')
    }
  }

  return (
    <div>
      <SiteNav
        activePath="/reports"
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/reports', label: 'Reports' },
          { to: '/publisher', label: 'Publisher Console' },
          { to: '/saved', label: 'Saved' },
          { to: '/tickets', label: 'My Tickets' }
        ]}
      />

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

        <section className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Curated Playlists</h3>
              <button className="btn btn-secondary" onClick={startNewPlaylist}>New playlist</button>
            </div>
            {playlistStatus && <p style={{ color: 'var(--gray-600)' }}>{playlistStatus}</p>}
            {adminPlaylists.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-200)' }}>
                    <th style={{ padding: '0.5rem 0' }}>Title</th>
                    <th>Window</th>
                    <th>Max events</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {adminPlaylists.map(playlist => (
                    <tr key={playlist.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '0.75rem 0' }}>
                        <strong>{playlist.title}</strong>
                        {playlist.description && <div style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>{playlist.description}</div>}
                      </td>
                      <td>
                        {playlist.daysFromOffset} to {playlist.daysToOffset} days
                      </td>
                      <td>{playlist.maxEvents}</td>
                      <td>
                        <span className={`badge badge-${playlist.enabled ? 'success' : 'secondary'}`}>
                          {playlist.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary" onClick={() => editPlaylist(playlist)}>Edit</button>
                          <button className="btn btn-secondary" onClick={() => handleDeletePlaylist(playlist.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <form onSubmit={handlePlaylistSubmit} style={{ display: 'grid', gap: '1rem' }}>
              <h4 style={{ margin: 0 }}>{editingPlaylistId ? 'Edit Playlist' : 'Create Playlist'}</h4>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div>
                  <label className="form-label">Title</label>
                  <input className="form-input" value={playlistForm.title} onChange={(e) => handlePlaylistFieldChange('title', e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Sort</label>
                  <input className="form-input" value={playlistForm.sort} onChange={(e) => handlePlaylistFieldChange('sort', e.target.value)} placeholder="rank" />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <input className="form-input" value={playlistForm.category} onChange={(e) => handlePlaylistFieldChange('category', e.target.value)} placeholder="Music" />
                </div>
                <div>
                  <label className="form-label">Query</label>
                  <input className="form-input" value={playlistForm.query} onChange={(e) => handlePlaylistFieldChange('query', e.target.value)} placeholder="Outdoor concerts" />
                </div>
                <div>
                  <label className="form-label">Creator type</label>
                  <input className="form-input" value={playlistForm.creatorType} onChange={(e) => handlePlaylistFieldChange('creatorType', e.target.value)} placeholder="business" />
                </div>
                <div>
                  <label className="form-label">Max events</label>
                  <input type="number" className="form-input" value={playlistForm.maxEvents} onChange={(e) => handlePlaylistFieldChange('maxEvents', Number(e.target.value))} min={1} />
                </div>
                <div>
                  <label className="form-label">Days from</label>
                  <input type="number" className="form-input" value={playlistForm.daysFromOffset} onChange={(e) => handlePlaylistFieldChange('daysFromOffset', Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label">Days to</label>
                  <input type="number" className="form-input" value={playlistForm.daysToOffset} onChange={(e) => handlePlaylistFieldChange('daysToOffset', Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label">Display order</label>
                  <input type="number" className="form-input" value={playlistForm.displayOrder} onChange={(e) => handlePlaylistFieldChange('displayOrder', Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={playlistForm.description} onChange={(e) => handlePlaylistFieldChange('description', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div>
                  <label className="form-label">City</label>
                  <input className="form-input" value={playlistForm.city} onChange={(e) => handlePlaylistFieldChange('city', e.target.value)} placeholder="Austin" />
                </div>
                <div>
                  <label className="form-label">State</label>
                  <input className="form-input" value={playlistForm.state} onChange={(e) => handlePlaylistFieldChange('state', e.target.value)} placeholder="TX" />
                </div>
                <div>
                  <label className="form-label">Radius (km)</label>
                  <input className="form-input" value={playlistForm.radiusKm} onChange={(e) => handlePlaylistFieldChange('radiusKm', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Default lat</label>
                  <input className="form-input" value={playlistForm.defaultLat} onChange={(e) => handlePlaylistFieldChange('defaultLat', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Default lon</label>
                  <input className="form-input" value={playlistForm.defaultLon} onChange={(e) => handlePlaylistFieldChange('defaultLon', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <label className="switch-row">
                  <span>Include private events</span>
                  <label className="switch">
                    <input type="checkbox" checked={playlistForm.includePrivate} onChange={(e) => handlePlaylistFieldChange('includePrivate', e.target.checked)} />
                    <span className="slider" />
                  </label>
                </label>
                <label className="switch-row">
                  <span>Requires location input</span>
                  <label className="switch">
                    <input type="checkbox" checked={playlistForm.requiresLocation} onChange={(e) => handlePlaylistFieldChange('requiresLocation', e.target.checked)} />
                    <span className="slider" />
                  </label>
                </label>
                <label className="switch-row">
                  <span>Enabled</span>
                  <label className="switch">
                    <input type="checkbox" checked={playlistForm.enabled} onChange={(e) => handlePlaylistFieldChange('enabled', e.target.checked)} />
                    <span className="slider" />
                  </label>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {editingPlaylistId && (
                  <button className="btn btn-secondary" type="button" onClick={startNewPlaylist}>
                    Cancel edit
                  </button>
                )}
                <button className="btn btn-primary" type="submit">
                  {editingPlaylistId ? 'Update Playlist' : 'Create Playlist'}
                </button>
                {playlistFormStatus && <span style={{ color: 'var(--gray-600)' }}>{playlistFormStatus}</span>}
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
