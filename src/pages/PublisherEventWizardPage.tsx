import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import EventWizardStepper from '../components/EventWizardStepper'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { createSeeClient, formatSeeApiError, CreatePublisherEventRequest } from '../api/seeClient'

const stepConfig = [
  { label: 'Basics', description: 'Create a draft with just the essentials.' },
  { label: 'Make it real', description: 'Add the finishing touches and publish.' }
]

const defaultForm = {
  title: '',
  startLocal: '',
  endLocal: '',
  venueName: '',
  venueAddress: '',
  venueCity: '',
  venueState: '',
  category: '',
  shortDescription: '',
  isOnline: false
}

const mapFieldErrors = (errors?: Record<string, string[]>) => {
  if (!errors) return {}
  const mapped: Record<string, string[]> = {}
  const mapKey = (key: string) => {
    const normalized = key.toLowerCase()
    if (normalized.includes('title')) return 'title'
    if (normalized.includes('start')) return 'startLocal'
    if (normalized.includes('end')) return 'endLocal'
    if (normalized.includes('venue')) return 'venueName'
    if (normalized.includes('category')) return 'category'
    return key
  }
  Object.entries(errors).forEach(([key, value]) => {
    mapped[mapKey(key)] = value
  })
  return mapped
}

export default function PublisherEventWizardPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const client = useMemo(() => createSeeClient({ getToken: () => auth.idToken }), [auth.idToken])
  const [form, setForm] = useState(defaultForm)
  const [status, setStatus] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [venueSearch, setVenueSearch] = useState('')
  const [venueResults, setVenueResults] = useState<any[]>([])
  const [venueStatus, setVenueStatus] = useState<string | null>(null)
  const stickyBarStyle = {
    position: 'sticky' as const,
    bottom: '1rem',
    background: 'var(--white)',
    padding: '0.75rem',
    border: '1px solid var(--gray-200)',
    borderRadius: '0.75rem',
    boxShadow: 'var(--shadow-sm)',
    zIndex: 2
  }

  const businessOptions = useMemo(() => {
    return (auth.businessMemberships || [])
      .map(member => ({
        id: (member.businessId || (member as any).BusinessId || '').toString(),
        name:
          member.businessName ||
          (member as any).BusinessName ||
          member.businessSlug ||
          (member as any).BusinessSlug ||
          'Business'
      }))
      .filter(option => option.id)
  }, [auth.businessMemberships])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    auth.primaryBusinessId || businessOptions[0]?.id || null
  )

  useEffect(() => {
    if (!selectedBusinessId && businessOptions.length) {
      setSelectedBusinessId(businessOptions[0]?.id || null)
    }
  }, [businessOptions, selectedBusinessId])

  useEffect(() => {
    if (!form.startLocal || form.endLocal) return
    const start = new Date(form.startLocal)
    if (Number.isNaN(start.getTime())) return
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const pad = (num: number) => num.toString().padStart(2, '0')
    const formatted = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`
    setForm(prev => ({ ...prev, endLocal: formatted }))
  }, [form.startLocal, form.endLocal])

  useEffect(() => {
    let handle: number | null = null
    if (!venueSearch || venueSearch.length < 2) {
      setVenueResults([])
      setVenueStatus(null)
      return
    }
    setVenueStatus('Searching venues…')
    handle = window.setTimeout(async () => {
      try {
        const resp = await api.fetchVenueDirectory(venueSearch, 20)
        const items =
          (Array.isArray((resp as any)?.items) && (resp as any).items) ||
          (Array.isArray((resp as any)?.Items) && (resp as any).Items) ||
          (Array.isArray(resp) ? resp : [])
        setVenueResults(items)
        setVenueStatus(items.length ? null : 'No venues found')
      } catch (err: any) {
        setVenueResults([])
        setVenueStatus(err?.message || 'Unable to load venues')
      }
    }, 250)
    return () => {
      if (handle) window.clearTimeout(handle)
    }
  }, [venueSearch])

  const updateForm = (key: keyof typeof defaultForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const validateStepOne = () => {
    const errors: Record<string, string[]> = {}
    if (!form.title.trim()) errors.title = ['Title is required.']
    if (!form.startLocal) errors.startLocal = ['Start time is required.']
    if (!form.endLocal) errors.endLocal = ['End time is required.']
    if (form.startLocal && form.endLocal) {
      const start = new Date(form.startLocal)
      const end = new Date(form.endLocal)
      if (start >= end) errors.endLocal = ['End time must be after start time.']
    }
    if (!form.isOnline && !form.venueName.trim()) {
      errors.venueName = ['Venue or online/TBD is required.']
    }
    if (!form.category.trim()) errors.category = ['Category is required.']
    return errors
  }

  const handleCreateDraft = async () => {
    setStatus(null)
    const errors = validateStepOne()
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const payload: CreatePublisherEventRequest = {
        title: form.title.trim(),
        description: form.shortDescription.trim() || null,
        startUtc: new Date(form.startLocal).toISOString(),
        endUtc: new Date(form.endLocal).toISOString(),
        timezone,
        category: form.category.trim() || null,
        venue: {
          name: form.isOnline ? 'Online / TBD' : form.venueName.trim(),
          address: form.venueAddress.trim() || null,
          city: form.venueCity.trim() || null,
          state: form.venueState.trim() || null
        },
        isOnline: form.isOnline
      }
      const resp = await client.createPublisherEvent(payload, { businessId: selectedBusinessId || undefined })
      const id = resp?.id || resp?.eventId || resp?.event?.id
      if (!id) throw new Error('Draft created but no event id was returned.')
      setFieldErrors({})
      navigate(`/publisher/events/${id}?draft=1`)
    } catch (err) {
      const formatted = formatSeeApiError(err, 'Unable to create draft.')
      setStatus(`${formatted.message}${formatted.correlationId ? ` (Ref: ${formatted.correlationId})` : ''}`)
      setFieldErrors(mapFieldErrors(formatted.fieldErrors))
    }
  }

  if (!auth.businessContextReady) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Checking publisher access…</h1>
        <p>Hang tight while we confirm your business permissions.</p>
      </div>
    )
  }

  return (
    <div>
      <SiteNav
        activePath="/publisher/events"
        links={[
          { to: '/publisher', label: 'Dashboard' },
          { to: '/publisher/events', label: 'Events' },
          { to: '/publisher/analytics', label: 'Analytics' }
        ]}
      />
      <div className="container" style={{ padding: '2.5rem 0', maxWidth: '860px' }}>
        <EventWizardStepper steps={stepConfig} activeStep={0} />

        <div className="card">
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            <>
                <div>
                  <label className="form-label">Publishing as</label>
                  {businessOptions.length > 0 ? (
                    <select
                      className="form-input"
                      value={selectedBusinessId || ''}
                      onChange={(e) => setSelectedBusinessId(e.target.value || null)}
                    >
                      {!selectedBusinessId && <option value="" disabled>Select a business</option>}
                      {businessOptions.map(option => (
                        <option key={option.id || option.name} value={option.id || ''}>
                          {option.name || option.id || 'Business'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input className="form-input" value="Business" readOnly />
                  )}
                </div>
                <div>
                  <label className="form-label">Title</label>
                  <input className="form-input" value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
                  {fieldErrors.title && <small className="error-text">{fieldErrors.title[0]}</small>}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Start date/time</label>
                    <input className="form-input" type="datetime-local" value={form.startLocal} onChange={(e) => updateForm('startLocal', e.target.value)} />
                    {fieldErrors.startLocal && <small className="error-text">{fieldErrors.startLocal[0]}</small>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">End date/time</label>
                    <input className="form-input" type="datetime-local" value={form.endLocal} onChange={(e) => updateForm('endLocal', e.target.value)} />
                    {fieldErrors.endLocal && <small className="error-text">{fieldErrors.endLocal[0]}</small>}
                  </div>
                </div>
                <div className="switch-row">
                  <div>
                    <label className="form-label" style={{ marginBottom: 0 }}>Online / TBD event</label>
                    <p style={{ color: 'var(--gray-600)', margin: 0 }}>No venue needed, you can add details later.</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={form.isOnline} onChange={(e) => updateForm('isOnline', e.target.checked)} />
                    <span className="slider" />
                  </label>
                </div>
                <div>
                  <label className="form-label">Venue</label>
                  <input
                    className="form-input"
                    value={form.venueName}
                    onChange={(e) => {
                      updateForm('venueName', e.target.value)
                      setVenueSearch(e.target.value)
                    }}
                    placeholder={form.isOnline ? 'Online / TBD' : 'Search for a venue'}
                    disabled={form.isOnline}
                  />
                  {fieldErrors.venueName && <small className="error-text">{fieldErrors.venueName[0]}</small>}
                  {venueStatus && <small style={{ color: 'var(--gray-600)' }}>{venueStatus}</small>}
                  {venueResults.length > 0 && !form.isOnline && (
                    <div className="card" style={{ marginTop: '0.35rem', maxHeight: '180px', overflowY: 'auto' }}>
                      <div className="card-body" style={{ display: 'grid', gap: '0.35rem' }}>
                        {venueResults.map((v: any) => (
                          <button
                            key={v.id || v.venueId || v.Name}
                            type="button"
                            className="btn btn-secondary"
                            style={{ textAlign: 'left' }}
                            onClick={() => {
                              updateForm('venueName', v.name || v.Name || '')
                              updateForm('venueAddress', v.address || v.Address || '')
                              updateForm('venueCity', v.city || v.City || '')
                              updateForm('venueState', v.state || v.State || '')
                              setVenueSearch('')
                              setVenueResults([])
                              setVenueStatus(null)
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{v.name || v.Name || 'Venue'}</div>
                            <div style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                              {[v.address || v.Address, v.city || v.City, v.state || v.State].filter(Boolean).join(', ')}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">City</label>
                    <input className="form-input" value={form.venueCity} onChange={(e) => updateForm('venueCity', e.target.value)} />
                  </div>
                  <div style={{ width: '120px' }}>
                    <label className="form-label">State</label>
                    <input className="form-input" value={form.venueState} onChange={(e) => updateForm('venueState', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <input className="form-input" value={form.category} onChange={(e) => updateForm('category', e.target.value)} />
                  {fieldErrors.category && <small className="error-text">{fieldErrors.category[0]}</small>}
                </div>
                <div>
                  <label className="form-label">Short description</label>
                  <input className="form-input" value={form.shortDescription} onChange={(e) => updateForm('shortDescription', e.target.value)} placeholder="1-2 lines about the event" />
                </div>
                <div style={stickyBarStyle}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link to="/publisher/events" className="btn btn-secondary">Cancel</Link>
                    <button className="btn btn-primary" type="button" onClick={handleCreateDraft}>Create Draft</button>
                  </div>
                </div>
            </>

            {status && <p style={{ color: 'var(--gray-600)', margin: 0 }}>{status}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
