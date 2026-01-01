import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, CreateEventRequest } from '../services/api'
import SiteNav from '../components/SiteNav'

const defaultEvent = {
  title: '',
  description: '',
  category: '',
  tags: '',
  admissionType: 'open',
  externalTicketUrl: '',
  timezone: '',
  startUtc: '',
  endUtc: '',
  venueName: '',
  venueAddress: '',
  venueCity: '',
  venueState: '',
  hostId: '',
  hostName: ''
}

export default function CreateEventPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const attemptedBusinessRefresh = useRef(false)
  const heroInputRef = useRef<HTMLInputElement | null>(null)
  const businessOptions = useMemo(() => {
    return (auth.businessMemberships || [])
      .map(member => ({
        id: (member.businessId || (member as any).BusinessId || '').toString(),
        name: member.businessName || (member as any).BusinessName || member.businessSlug || (member as any).BusinessSlug || 'Business',
        status: member.status || (member as any).Status || 'active'
      }))
      .filter(option => option.id)
  }, [auth.businessMemberships])
  const resolvedBusinessId = auth.primaryBusinessId || businessOptions[0]?.id || null
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(resolvedBusinessId)
  const selectedBusiness = businessOptions.find(opt => opt.id === selectedBusinessId) || null
  const resolvedBusinessName = selectedBusiness?.name || auth.profile?.business?.name || null
  const hasBusinessAffiliation = Boolean(
    auth.profile?.isBusiness ||
    selectedBusinessId ||
    businessOptions.length > 0
  )
  const [form, setForm] = useState(defaultEvent)
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [venueSearch, setVenueSearch] = useState('')
  const [venueResults, setVenueResults] = useState<any[]>([])
  const [venueStatus, setVenueStatus] = useState<string | null>(null)
  const [hostSearch, setHostSearch] = useState('')
  const [hostResults, setHostResults] = useState<any[]>([])
  const [hostStatus, setHostStatus] = useState<string | null>(null)
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [heroPreview, setHeroPreview] = useState<string | null>(null)
  const [heroStatus, setHeroStatus] = useState<string | null>(null)

  // Ensure we have the latest business memberships and keep selection valid
  useEffect(() => {
    if (
      auth.businessContextReady &&
      auth.idToken &&
      (!auth.businessMemberships || auth.businessMemberships.length === 0) &&
      !attemptedBusinessRefresh.current
    ) {
      attemptedBusinessRefresh.current = true
      auth.refreshBusinessMemberships().catch(() => {
        attemptedBusinessRefresh.current = false
      })
    }
  }, [auth.businessContextReady, auth.idToken, auth.businessMemberships, auth.refreshBusinessMemberships])

  useEffect(() => {
    if (!selectedBusinessId && businessOptions.length) {
      const preferred = businessOptions.find(option => (option.status || '').toLowerCase() === 'active') || businessOptions[0]
      setSelectedBusinessId(preferred?.id || null)
    }
    if (selectedBusinessId && businessOptions.length) {
      const stillExists = businessOptions.some(option => option.id === selectedBusinessId)
      if (!stillExists) {
        const fallback = businessOptions[0]
        setSelectedBusinessId(fallback?.id || null)
      }
    }
  }, [businessOptions, selectedBusinessId])

  // Venue typeahead
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

  // Host typeahead
  useEffect(() => {
    let handle: number | null = null
    if (!hostSearch || hostSearch.length < 2) {
      setHostResults([])
      setHostStatus(null)
      return
    }
    setHostStatus('Searching hosts…')
    handle = window.setTimeout(async () => {
      try {
        const resp = await api.fetchHostDirectory(hostSearch, 20)
        const items =
          (Array.isArray((resp as any)?.items) && (resp as any).items) ||
          (Array.isArray((resp as any)?.Items) && (resp as any).Items) ||
          (Array.isArray(resp) ? resp : [])
        setHostResults(items)
        setHostStatus(items.length ? null : 'No hosts found')
      } catch (err: any) {
        setHostResults([])
        setHostStatus(err?.message || 'Unable to load hosts')
      }
    }, 250)
    return () => {
      if (handle) window.clearTimeout(handle)
    }
  }, [hostSearch])

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const resetHeroSelection = () => {
    if (typeof window === 'undefined') return
    setHeroFile(null)
    setHeroPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (heroInputRef.current) heroInputRef.current.value = ''
  }

  const handleHeroFileSelection = (file: File | null) => {
    if (typeof window === 'undefined') return
    setHeroStatus(null)
    setHeroFile(file)
    setHeroPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
  }

  const resolveUploadedImageUrl = (result: any): string | null => {
    if (!result || typeof result !== 'object') return null
    return (
      result.resolvedUrl ||
      result.url ||
      result.imageUrl ||
      result.ImageUrl ||
      result.heroImageUrl ||
      result.HeroImageUrl ||
      null
    )
  }

  useEffect(() => {
    return () => {
      if (heroPreview && typeof window !== 'undefined') {
        URL.revokeObjectURL(heroPreview)
      }
    }
  }, [heroPreview])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.idToken) {
      setStatus('Sign in with a publisher account to create events.')
      return
    }
    setSubmitting(true)
    setStatus(null)
    setHeroStatus(null)
    try {
      const resolvedTimezone = form.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const tagsArray = form.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
      const payload: CreateEventRequest = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim() || null,
        tags: tagsArray,
        admissionType: form.admissionType || 'open',
        externalTicketUrl: form.externalTicketUrl.trim() || null,
        startUtc: form.startUtc ? new Date(form.startUtc).toISOString() : new Date().toISOString(),
        endUtc: form.endUtc ? new Date(form.endUtc).toISOString() : new Date().toISOString(),
        timezone: resolvedTimezone,
        hostId: form.hostId || null,
        hostName: form.hostName?.trim() || null,
        venue: {
          name: form.venueName.trim(),
          address: form.venueAddress.trim(),
          city: form.venueCity.trim(),
          state: form.venueState.trim()
        }
      }
      const resp = await api.createPublisherEventAuthorized(payload, auth.idToken, selectedBusinessId || undefined)
      const messages: string[] = ['Event submitted for review.']
      const newEventId = resp?.id || resp?.eventId || resp?.event?.id || null
      let heroNavigationDelay = 0

      if (heroFile) {
        if (newEventId) {
          try {
            setHeroStatus('Uploading hero image…')
            const uploadResult = await api.uploadEventImage(newEventId, heroFile, 'hero', auth.idToken, selectedBusinessId || undefined)
            const uploadedUrl = resolveUploadedImageUrl(uploadResult)
            if (uploadedUrl) {
              try {
                await api.updatePublisherEventAuthorized(
                  newEventId,
                  { imageUrl: uploadedUrl, ImageUrl: uploadedUrl },
                  auth.idToken,
                  selectedBusinessId || undefined
                )
                messages.push('Hero image uploaded.')
                setHeroStatus('Hero image uploaded.')
                resetHeroSelection()
              } catch (linkErr: any) {
                const linkMessage =
                  linkErr?.message || 'Hero image uploaded, but failed to attach URL to the event.'
                messages.push(linkMessage)
                setHeroStatus(linkMessage)
                heroNavigationDelay = 2400
              }
            } else {
              const missingUrlMessage = 'Hero image uploaded, but no URL was returned.'
              messages.push(missingUrlMessage)
              setHeroStatus(missingUrlMessage)
              heroNavigationDelay = 2400
            }
          } catch (heroErr: any) {
            const heroMessage = heroErr?.message || 'Hero image upload failed.'
            messages.push(heroMessage)
            setHeroStatus(heroMessage)
            heroNavigationDelay = 2400
          }
        } else {
          const missingIdMessage = 'Event created, but the response did not include an event id for hero upload.'
          messages.push(missingIdMessage)
          setHeroStatus(missingIdMessage)
          heroNavigationDelay = 2400
        }
      }

      setStatus(messages.join(' '))
      setForm(defaultEvent)
      if (resp?.id || resp?.eventId) {
        if (heroNavigationDelay > 0) {
          if (typeof window !== 'undefined') {
            window.setTimeout(() => navigate('/publisher/events'), heroNavigationDelay)
          } else {
            navigate('/publisher/events')
          }
        } else {
          navigate('/publisher/events')
        }
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

  if (!auth.businessContextReady) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Checking publisher access…</h1>
        <p>Hang tight while we confirm your business permissions.</p>
      </div>
    )
  }

  if (auth.businessContextReady && businessOptions.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>No business found</h1>
        <p style={{ maxWidth: '520px', margin: '0 auto 1rem' }}>
          We couldn’t find any business memberships on this account. Please upgrade or request access.
        </p>
        <Link to="/profile" className="btn btn-primary">Manage account</Link>
      </div>
    )
  }

  if (!hasBusinessAffiliation) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Business access required</h1>
        <p style={{ maxWidth: '520px', margin: '0 auto 1rem' }}>
          Only verified business or publisher accounts can create events. Upgrade your account or request access from a business admin.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/profile" className="btn btn-primary">Manage account</Link>
          <Link to="/discover" className="btn btn-secondary">Browse events</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SiteNav
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/publisher/events', label: 'My Events' }
        ]}
        activePath="/publisher/events"
      />

      <div className="container" style={{ padding: '3rem 0', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Create Event</h1>
        <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
          New events are submitted for moderation before they are approved.
        </p>
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
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
                        {option.status && option.status !== 'active' ? ` (${option.status})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="form-input" value={resolvedBusinessName || 'Business'} readOnly />
                )}
                <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                  Choose which business profile this event should belong to.
                </p>
              </div>
              <div>
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={(e) => updateField('title', e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={4} value={form.description} onChange={(e) => updateField('description', e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Category</label>
                  <input className="form-input" value={form.category} onChange={(e) => updateField('category', e.target.value)} placeholder="Music, Tech, Food, etc." />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Tags</label>
                  <input className="form-input" value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="Live music, nightlife, ... (comma separated)" />
                </div>
              </div>
              <div>
                <label className="form-label">Hero Image</label>
                <input
                  ref={heroInputRef}
                  className="form-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleHeroFileSelection(e.target.files?.[0] || null)}
                />
                <small style={{ color: 'var(--gray-600)' }}>Landscape 16:9 images work best. PNG or JPG up to 5&nbsp;MB.</small>
                {heroPreview && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <img
                      src={heroPreview}
                      alt="Selected hero preview"
                      style={{ width: '100%', maxWidth: '520px', borderRadius: '0.75rem', boxShadow: 'var(--shadow-sm)' }}
                    />
                  </div>
                )}
                {heroStatus && <p style={{ color: 'var(--gray-600)', marginTop: '0.5rem' }}>{heroStatus}</p>}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Admission Type</label>
                  <select className="form-input" value={form.admissionType} onChange={(e) => updateField('admissionType', e.target.value)}>
                    <option value="open">Open / RSVP</option>
                    <option value="free">Free</option>
                    <option value="see_ticketed">SEE Ticketed</option>
                    <option value="external_ticketed">External Ticketed</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">External Ticket URL</label>
                  <input className="form-input" value={form.externalTicketUrl} onChange={(e) => updateField('externalTicketUrl', e.target.value)} placeholder="https://tickets.example.com" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Start (local)</label>
                  <input className="form-input" type="datetime-local" value={form.startUtc} onChange={(e) => updateField('startUtc', e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">End (local)</label>
                  <input className="form-input" type="datetime-local" value={form.endUtc} onChange={(e) => updateField('endUtc', e.target.value)} required />
                </div>
                <div style={{ width: '220px' }}>
                  <label className="form-label">Timezone</label>
                  <input className="form-input" value={form.timezone} onChange={(e) => updateField('timezone', e.target.value)} placeholder="America/New_York" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Venue Name</label>
                  <input
                    className="form-input"
                    value={form.venueName}
                    onChange={(e) => {
                      updateField('venueName', e.target.value)
                      setVenueSearch(e.target.value)
                    }}
                    placeholder="Downtown Venue"
                  />
                  {venueStatus && <small style={{ color: 'var(--gray-600)' }}>{venueStatus}</small>}
                  {venueResults.length > 0 && (
                    <div className="card" style={{ marginTop: '0.35rem', maxHeight: '180px', overflowY: 'auto' }}>
                      <div className="card-body" style={{ display: 'grid', gap: '0.35rem' }}>
                        {venueResults.map((v: any) => (
                          <button
                            key={v.id || v.venueId || v.Name}
                            type="button"
                            className="btn btn-secondary"
                            style={{ textAlign: 'left' }}
                            onClick={() => {
                              updateField('venueName', v.name || v.Name || '')
                              updateField('venueAddress', v.address || v.Address || '')
                              updateField('venueCity', v.city || v.City || '')
                              updateField('venueState', v.state || v.State || '')
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
                <div style={{ flex: 1 }}>
                  <label className="form-label">Street Address</label>
                  <input className="form-input" value={form.venueAddress} onChange={(e) => updateField('venueAddress', e.target.value)} placeholder="123 Main St" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">City</label>
                  <input className="form-input" value={form.venueCity} onChange={(e) => updateField('venueCity', e.target.value)} />
                </div>
                <div style={{ width: '120px' }}>
                  <label className="form-label">State</label>
                  <input className="form-input" value={form.venueState} onChange={(e) => updateField('venueState', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="form-label">Host (optional)</label>
                <input
                  className="form-input"
                  value={form.hostName}
                  onChange={(e) => {
                    updateField('hostName', e.target.value)
                    setHostSearch(e.target.value)
                  }}
                  placeholder="Search or enter host name"
                />
                {hostStatus && <small style={{ color: 'var(--gray-600)' }}>{hostStatus}</small>}
                {hostResults.length > 0 && (
                  <div className="card" style={{ marginTop: '0.35rem', maxHeight: '160px', overflowY: 'auto' }}>
                    <div className="card-body" style={{ display: 'grid', gap: '0.35rem' }}>
                      {hostResults.map((h: any) => (
                        <button
                          key={h.id || h.hostId || h.Name}
                          type="button"
                          className="btn btn-secondary"
                          style={{ textAlign: 'left' }}
                          onClick={() => {
                            updateField('hostId', h.id || h.hostId || h.Id || '')
                            updateField('hostName', h.name || h.Name || '')
                            setHostSearch('')
                            setHostResults([])
                            setHostStatus(null)
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{h.name || h.Name || 'Host'}</div>
                          {(h.city || h.City || h.state || h.State) && (
                            <div style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                              {[h.city || h.City, h.state || h.State].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <small style={{ color: 'var(--gray-600)' }}>Link a known host for better discovery and attribution.</small>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link to="/publisher/events" className="btn btn-secondary">Cancel</Link>
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
