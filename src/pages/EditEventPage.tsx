import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, seeApi, CreateEventRequest } from '../services/api'
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

const pad = (value: number) => value.toString().padStart(2, '0')
const isoToLocalInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function EditEventPage() {
  const { eventId } = useParams()
  const auth = useAuth()
  const navigate = useNavigate()
  const attemptedBusinessRefresh = useRef(false)
  const heroInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState(defaultEvent)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [venueSearch, setVenueSearch] = useState('')
  const [venueResults, setVenueResults] = useState<any[]>([])
  const [venueStatus, setVenueStatus] = useState<string | null>(null)
  const [hostSearch, setHostSearch] = useState('')
  const [hostResults, setHostResults] = useState<any[]>([])
  const [hostStatus, setHostStatus] = useState<string | null>(null)
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [heroPreview, setHeroPreview] = useState<string | null>(null)
  const [heroPreviewOwned, setHeroPreviewOwned] = useState(false)
  const [heroStatus, setHeroStatus] = useState<string | null>(null)
  const [initialHeroUrl, setInitialHeroUrl] = useState<string | null>(null)
  const heroPreviewRef = useRef<string | null>(null)
  const heroPreviewOwnedRef = useRef(false)

  const businessOptions = useMemo(() => {
    return (auth.businessMemberships || [])
      .map(member => ({
        id: (member.businessId || (member as any).BusinessId || '').toString(),
        name:
          member.businessName ||
          (member as any).BusinessName ||
          member.businessSlug ||
          (member as any).BusinessSlug ||
          'Business',
        status: member.status || (member as any).Status || 'active'
      }))
      .filter(option => option.id)
  }, [auth.businessMemberships])

  const resolvedBusinessId = auth.primaryBusinessId || businessOptions[0]?.id || null
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(resolvedBusinessId)

  const hasBusinessAffiliation = Boolean(
    auth.profile?.isBusiness ||
    selectedBusinessId ||
    businessOptions.length > 0
  )

  useEffect(() => {
    heroPreviewRef.current = heroPreview
  }, [heroPreview])

  useEffect(() => {
    heroPreviewOwnedRef.current = heroPreviewOwned
  }, [heroPreviewOwned])

  useEffect(() => {
    return () => {
      if (heroPreviewRef.current && heroPreviewOwnedRef.current && typeof window !== 'undefined') {
        URL.revokeObjectURL(heroPreviewRef.current)
      }
    }
  }, [])

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

  const resetHeroPreview = (showMessage = false, message?: string | null) => {
    if (heroPreviewRef.current && heroPreviewOwnedRef.current && typeof window !== 'undefined') {
      URL.revokeObjectURL(heroPreviewRef.current)
    }
    heroPreviewRef.current = initialHeroUrl
    heroPreviewOwnedRef.current = false
    setHeroFile(null)
    setHeroPreview(initialHeroUrl)
    setHeroPreviewOwned(false)
    if (heroInputRef.current) heroInputRef.current.value = ''
    if (showMessage) {
      setHeroStatus(message ?? (initialHeroUrl ? 'Reverted to existing hero image.' : 'Hero image cleared.'))
    }
  }

  const handleHeroFileSelection = (file: File | null) => {
    setHeroStatus(null)
    if (!file) {
      resetHeroPreview(true)
      return
    }
    if (heroPreview && heroPreviewOwned && typeof window !== 'undefined') {
      URL.revokeObjectURL(heroPreview)
    }
    setHeroFile(file)
    const objectUrl = URL.createObjectURL(file)
    setHeroPreview(objectUrl)
    setHeroPreviewOwned(true)
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

  const handleVenuePick = (venue: any) => {
    const nextName = venue.name || venue.Name || ''
    const nextAddress = venue.address || venue.Address || ''
    const nextCity = venue.city || venue.City || ''
    const nextState = venue.state || venue.State || ''
    setForm(prev => ({
      ...prev,
      venueName: nextName,
      venueAddress: nextAddress,
      venueCity: nextCity,
      venueState: nextState
    }))
    setVenueSearch('')
    setVenueResults([])
    setVenueStatus(nextName ? `Using ${nextName}.` : null)
  }

  const handleHostPick = (host: any) => {
    const nextHostId = host.id || host.hostId || host.Id || ''
    const nextHostName = host.name || host.Name || host.displayName || host.DisplayName || host.email || ''
    setForm(prev => ({
      ...prev,
      hostId: nextHostId ? String(nextHostId) : '',
      hostName: nextHostName
    }))
    setHostSearch('')
    setHostResults([])
    setHostStatus(nextHostName ? `Using ${nextHostName}.` : null)
  }

  const loadEvent = useCallback(async (options?: { suppressLoading?: boolean; preserveStatus?: boolean }) => {
    if (!eventId || !auth.idToken) {
      setStatus('Event not found or access denied.')
      setLoading(false)
      return
    }

    if (!options?.suppressLoading) {
      setLoading(true)
    }
    if (!options?.preserveStatus) {
      setStatus(null)
    }

    try {
      let eventData: any | null = null

      try {
        const resp = await api.fetchPublisherEventsAuthorized(auth.idToken, {
          businessId: selectedBusinessId || undefined,
          search: eventId,
          pageSize: 50
        })
        const items = Array.isArray(resp?.items) ? resp.items : Array.isArray(resp) ? resp : []
        eventData = items.find((item: any) => (item?.id || item?.Id || item?.eventId) === eventId) || null
      } catch (err) {
        console.debug('Publisher event lookup failed, falling back to public event load', err)
      }

      if (!eventData) {
        eventData = await seeApi.getEvent(eventId)
      }

      if (!eventData) {
        throw new Error('Event details unavailable')
      }

      const tagsSource = eventData.tags || eventData.Tags || []
      const tags = Array.isArray(tagsSource) ? tagsSource.join(', ') : (tagsSource || '')
      const venue = eventData.venue || eventData.Venue || {}
      const venueName = venue.name || venue.Name || eventData.venueName || eventData.VenueName || ''
      const venueAddress = venue.address || venue.Address || eventData.venueAddress || eventData.VenueAddress || ''
      const venueCity = venue.city || venue.City || eventData.venueCity || eventData.VenueCity || ''
      const venueState = venue.state || venue.State || eventData.venueState || eventData.VenueState || ''
      const admission = eventData.admissionType || eventData.AdmissionType || 'open'
      const category = eventData.category || eventData.Category || ''
      const timezone = eventData.timezone || eventData.Timezone || ''
      const externalTicketUrl =
        eventData.externalTicketUrl ||
        eventData.ExternalTicketUrl ||
        eventData.ticketUrl ||
        eventData.ticketingUrl ||
        ''
      const startUtc = isoToLocalInput(eventData.startUtc || eventData.StartUtc || eventData.startDate)
      const endUtc = isoToLocalInput(eventData.endUtc || eventData.EndUtc || eventData.endDate)
      const hostId = eventData.hostId || eventData.HostId || eventData.host?.id || ''
      const hostName = eventData.hostName || eventData.HostName || eventData.host?.name || eventData.hostDisplayName || ''

      setForm({
        title: eventData.title || eventData.name || eventData.Title || '',
        description: eventData.description || eventData.Description || '',
        category,
        tags,
        admissionType: typeof admission === 'string' ? admission : 'open',
        externalTicketUrl: externalTicketUrl || '',
        timezone,
        startUtc,
        endUtc,
        venueName,
        venueAddress,
        venueCity,
        venueState,
        hostId: hostId || '',
        hostName: hostName || ''
      })

      const heroUrl =
        eventData.heroImageUrl ||
        eventData.HeroImageUrl ||
        eventData.heroImage ||
        eventData.HeroImage ||
        eventData.imageUrl ||
        eventData.ImageUrl ||
        null

      if (heroPreviewRef.current && heroPreviewOwnedRef.current && typeof window !== 'undefined') {
        URL.revokeObjectURL(heroPreviewRef.current)
      }
      heroPreviewRef.current = heroUrl
      heroPreviewOwnedRef.current = false
      setInitialHeroUrl(heroUrl)
      setHeroPreview(heroUrl)
      setHeroPreviewOwned(false)
      setHeroFile(null)
      if (heroInputRef.current) heroInputRef.current.value = ''

      const eventBusinessId = (eventData.businessId || eventData.BusinessId || null)?.toString() || null
      if (eventBusinessId && eventBusinessId !== (selectedBusinessId || null)) {
        setSelectedBusinessId(eventBusinessId)
      }
    } catch (err: any) {
      console.error('Failed to load event', err)
      setStatus(err?.message || 'Unable to load event details.')
    } finally {
      setLoading(false)
    }
  }, [auth.idToken, eventId, selectedBusinessId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!auth.idToken) {
      setStatus('Sign in with a publisher account to update events.')
      return
    }
    if (!eventId) {
      setStatus('Missing event details for update.')
      return
    }

    setSubmitting(true)
    setStatus(null)
    setHeroStatus(null)

    try {
      const resolvedTimezone = form.timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const tagsArray = form.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)

      const payload: Partial<CreateEventRequest> = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim() || null,
        tags: tagsArray,
        admissionType: form.admissionType || 'open',
        externalTicketUrl: form.externalTicketUrl.trim() || null,
        startUtc: form.startUtc ? new Date(form.startUtc).toISOString() : undefined,
        endUtc: form.endUtc ? new Date(form.endUtc).toISOString() : undefined,
        timezone: resolvedTimezone,
        hostId: form.hostId?.trim() || null,
        hostName: form.hostName?.trim() || null,
        venue: {
          name: form.venueName.trim(),
          address: form.venueAddress.trim(),
          city: form.venueCity.trim(),
          state: form.venueState.trim()
        }
      }

      const messages: string[] = []
      let heroMessage: string | null = null
      let uploadedHeroUrl: string | null = null

      if (heroFile) {
        try {
          setHeroStatus('Uploading hero image…')
          const uploadResult = await api.uploadEventImage(eventId, heroFile, 'hero', auth.idToken, selectedBusinessId || undefined)
          uploadedHeroUrl = resolveUploadedImageUrl(uploadResult)
          if (uploadedHeroUrl) {
            heroMessage = 'Hero image uploaded.'
            setHeroStatus(heroMessage)
          } else {
            heroMessage = 'Hero image uploaded, but no URL was returned.'
            setHeroStatus(heroMessage)
          }
        } catch (heroErr: any) {
          heroMessage = heroErr?.message || 'Hero image upload failed.'
          setHeroStatus(heroMessage)
        }
      }

      if (uploadedHeroUrl) {
        payload.imageUrl = uploadedHeroUrl
        payload.ImageUrl = uploadedHeroUrl
      }

      await api.updatePublisherEventAuthorized(eventId, payload, auth.idToken, selectedBusinessId || undefined)

      messages.push('Event details updated.')
      if (heroMessage) {
        messages.push(heroMessage)
      }

      setStatus(messages.join(' '))
      await loadEvent({ suppressLoading: true, preserveStatus: true })
    } catch (err: any) {
      console.error('Failed to update event', err)
      setStatus(err?.message || 'Failed to update event.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  if (!auth.idToken) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Edit Event</h1>
        <p>Sign in with a publisher account to update events.</p>
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

  if (auth.businessContextReady && businessOptions.length === 0 && !selectedBusinessId) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>No business found</h1>
        <p style={{ maxWidth: '520px', margin: '0 auto 1rem' }}>
          We could not find any business memberships for this account. Please upgrade or request access.
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
          Only verified business or publisher accounts can edit events. Upgrade your account or request access from a business admin.
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>Edit Event</h1>
            <p style={{ color: 'var(--gray-600)', margin: '0.35rem 0 0' }}>Update your event details, venue, tags, and hero image.</p>
          </div>
          <Link to={`/publisher/events/${eventId}`} className="btn btn-secondary">Back to manage</Link>
        </div>

        {loading ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <strong>Loading event data…</strong>
          </div>
        ) : (
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
                    <input className="form-input" value={auth.profile?.business?.name || 'Business'} readOnly />
                  )}
                  <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    Choose which business profile owns this event.
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
                  <small style={{ color: 'var(--gray-600)' }}>Landscape 16:9 images work best. PNG or JPG up to 5 MB.</small>
                  {heroPreview && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <img
                        src={heroPreview}
                        alt="Hero preview"
                        style={{ width: '100%', maxWidth: '520px', borderRadius: '0.75rem', boxShadow: 'var(--shadow-sm)' }}
                      />
                      {heroPreviewOwned && (
                        <button type="button" className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => resetHeroPreview(true)}>
                          Remove selected image
                        </button>
                      )}
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
                    <label className="form-label">Start Time (local)</label>
                    <input className="form-input" type="datetime-local" value={form.startUtc} onChange={(e) => updateField('startUtc', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">End Time (local)</label>
                    <input className="form-input" type="datetime-local" value={form.endUtc} onChange={(e) => updateField('endUtc', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Timezone</label>
                    <input className="form-input" value={form.timezone} onChange={(e) => updateField('timezone', e.target.value)} placeholder="America/New_York" />
                  </div>
                </div>
                <div>
                  <label className="form-label">Venue</label>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <input className="form-input" value={form.venueName} onChange={(e) => updateField('venueName', e.target.value)} placeholder="Venue name" />
                    <input className="form-input" value={form.venueAddress} onChange={(e) => updateField('venueAddress', e.target.value)} placeholder="Street address" />
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <input className="form-input" style={{ flex: 1 }} value={form.venueCity} onChange={(e) => updateField('venueCity', e.target.value)} placeholder="City" />
                      <input className="form-input" style={{ flex: 1 }} value={form.venueState} onChange={(e) => updateField('venueState', e.target.value)} placeholder="State" />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <input
                      className="form-input"
                      placeholder="Search venue directory"
                      value={venueSearch}
                      onChange={(e) => setVenueSearch(e.target.value)}
                    />
                    {venueStatus && <p style={{ color: 'var(--gray-500)', marginTop: '0.35rem' }}>{venueStatus}</p>}
                    {venueResults.length > 0 && (
                      <div className="card" style={{ marginTop: '0.75rem' }}>
                        <div className="card-body" style={{ display: 'grid', gap: '0.5rem' }}>
                          {venueResults.map(result => (
                            <button
                              key={result.id || result.Id || result.name}
                              type="button"
                              className="nav-link"
                              style={{ justifyContent: 'flex-start' }}
                              onClick={() => handleVenuePick(result)}
                            >
                              {(result.name || result.Name || 'Venue')}
                              {result.city || result.City ? ` • ${result.city || result.City}` : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="form-label">Host (optional)</label>
                  <input className="form-input" value={form.hostName} onChange={(e) => updateField('hostName', e.target.value)} placeholder="Host name" />
                  <input className="form-input" style={{ marginTop: '0.5rem' }} value={form.hostId} onChange={(e) => updateField('hostId', e.target.value)} placeholder="Host id" />
                  <div style={{ marginTop: '0.75rem' }}>
                    <input
                      className="form-input"
                      placeholder="Search hosts"
                      value={hostSearch}
                      onChange={(e) => setHostSearch(e.target.value)}
                    />
                    {hostStatus && <p style={{ color: 'var(--gray-500)', marginTop: '0.35rem' }}>{hostStatus}</p>}
                    {hostResults.length > 0 && (
                      <div className="card" style={{ marginTop: '0.75rem' }}>
                        <div className="card-body" style={{ display: 'grid', gap: '0.5rem' }}>
                          {hostResults.map(result => (
                            <button
                              key={result.id || result.Id || result.email}
                              type="button"
                              className="nav-link"
                              style={{ justifyContent: 'flex-start' }}
                              onClick={() => handleHostPick(result)}
                            >
                              {(result.name || result.Name || result.displayName || result.DisplayName || 'Host')}
                              {result.email ? ` • ${result.email}` : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {status && <p style={{ color: 'var(--gray-700)' }}>{status}</p>}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save changes'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => navigate(`/publisher/events/${eventId}`)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
