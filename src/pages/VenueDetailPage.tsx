import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import EventCard from '../components/EventCard'
import { api, Event, Venue } from '../services/api'
import { useAuth } from '../context/AuthContext'
import VenueAttributeChips from '../components/VenueAttributeChips'

export default function VenueDetailPage() {
  const { id } = useParams()
  const auth = useAuth()
  const navigate = useNavigate()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [status, setStatus] = useState<string | null>('Loading venue…')
  const [eventStatus, setEventStatus] = useState<string | null>(null)
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [claimProofType, setClaimProofType] = useState('manual')
  const [claimProofValue, setClaimProofValue] = useState('')
  const [claimStatusMsg, setClaimStatusMsg] = useState<string | null>(null)

  const canManage = useMemo(() => {
    if (!venue) return false
    if (!auth?.primaryBusinessId) return false
    return venue.claimedByBusinessId === auth.primaryBusinessId && venue.claimStatus === 'claimed'
  }, [venue, auth?.primaryBusinessId])

  const canClaim = useMemo(() => {
    if (!venue) return false
    if (venue.claimStatus && venue.claimStatus !== 'unclaimed') return false
    return Boolean(auth?.idToken && auth?.primaryBusinessId)
  }, [venue, auth?.idToken, auth?.primaryBusinessId])

  const loadVenue = async () => {
    if (!id) return
    setStatus('Loading venue…')
    try {
      const data = await api.fetchVenue(id)
      setVenue(data)
      setStatus(null)
    } catch (err: any) {
      setStatus(err?.message || 'Venue not found.')
    }
  }

  const loadEvents = async () => {
    if (!id) return
    setEventStatus('Loading upcoming events…')
    try {
      const now = new Date()
      const horizon = new Date()
      horizon.setMonth(horizon.getMonth() + 3)
      const list = await api.fetchVenueEvents(id, {
        fromUtc: now.toISOString(),
        toUtc: horizon.toISOString()
      })
      setEvents(list)
      setEventStatus(list.length ? null : 'No upcoming events listed yet.')
    } catch (err: any) {
      setEvents([])
      setEventStatus(err?.message || 'Unable to load events for this venue.')
    }
  }

  useEffect(() => {
    loadVenue()
    loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!id) return
    api.recordVenueInteraction(id, { type: 'view', sessionId: auth.sessionId || undefined }).catch(() => {})
  }, [id, auth.sessionId])

  const handleWebsiteClick = (url?: string | null) => {
    if (!id || !url) return
    api.recordVenueInteraction(id, { type: 'click_website', sessionId: auth.sessionId || undefined }).catch(() => {})
    window.open(url, '_blank')
  }

  const handleInstagramClick = (url?: string | null) => {
    if (!id || !url) return
    api.recordVenueInteraction(id, { type: 'click_instagram', sessionId: auth.sessionId || undefined }).catch(() => {})
    window.open(url, '_blank')
  }

  const handleSubmitClaim = async () => {
    if (!id || !auth.idToken || !auth.primaryBusinessId) {
      setClaimStatusMsg('Sign in with a business account to claim this venue.')
      return
    }
    if (!claimProofValue.trim()) {
      setClaimStatusMsg('Add proof so we can verify you manage this venue.')
      return
    }
    try {
      setClaimStatusMsg('Submitting claim…')
      await api.submitVenueClaim(id, {
        businessId: auth.primaryBusinessId,
        proofType: claimProofType,
        proofValue: claimProofValue.trim()
      }, auth.idToken)
      setClaimStatusMsg('Claim submitted. We will review and email you.')
      setClaimModalOpen(false)
      loadVenue()
    } catch (err: any) {
      setClaimStatusMsg(err?.message || 'Unable to submit claim right now.')
    }
  }

  const renderClaimCta = () => {
    if (!venue) return null
    if (canManage) {
      return (
        <button className="btn btn-primary" onClick={() => navigate(`/host/venues/${venue.id}/manage`)}>
          Manage venue
        </button>
      )
    }
    if (venue.claimStatus === 'pending') {
      return <button className="btn btn-secondary" disabled>Claim pending review</button>
    }
    if (canClaim) {
      return (
        <button className="btn btn-primary" onClick={() => setClaimModalOpen(true)}>
          Claim this venue
        </button>
      )
    }
    return null
  }

  return (
    <div>
      <SiteNav activePath="/venues" />
      <div style={{ background: 'linear-gradient(135deg, var(--light-blue), #eef2ff)', padding: '3rem 0' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>Venue</p>
            <h1 style={{ margin: 0, fontSize: '2.4rem' }}>{venue?.name || 'Venue'}</h1>
          <p style={{ color: 'var(--gray-700)', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
            {venue?.description || 'Venue details will appear here when available.'}
          </p>
          {status && <p style={{ color: 'var(--gray-600)', marginTop: '0.25rem' }}>{status}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {venue?.websiteUrl && <button className="btn btn-secondary" type="button" onClick={() => handleWebsiteClick(venue.websiteUrl)}>Website</button>}
            {venue?.instagramUrl && <button className="btn btn-secondary" type="button" onClick={() => handleInstagramClick(venue.instagramUrl)}>Instagram</button>}
            {renderClaimCta()}
            </div>
            <div style={{ marginTop: '1rem', color: 'var(--gray-700)' }}>
              {venue?.address && <div>{venue.address}</div>}
              {[venue?.city, venue?.state].filter(Boolean).length > 0 && (
                <div>{[venue?.city, venue?.state].filter(Boolean).join(', ')}</div>
              )}
              {venue?.phone && <div>{venue.phone}</div>}
            </div>
            {venue?.tags && venue.tags.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {venue.tags.map(tag => (
                  <span key={tag} className="chip chip-outline">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div>
            {venue?.imageUrl ? (
              <div style={{ borderRadius: '1rem', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                <img src={venue.imageUrl} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover', maxHeight: 360 }} />
              </div>
            ) : (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ margin: 0, color: 'var(--gray-600)' }}>No hero image yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="container" style={{ padding: '2rem 0 3rem' }}>
        {venue?.attributes && venue.attributes.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ margin: 0 }}>Amenities</h3>
              </div>
              <div className="card-body">
                <VenueAttributeChips attributes={venue.attributes} grouped />
              </div>
            </div>
          </section>
        )}
        <section style={{ marginBottom: '2rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ margin: 0 }}>Upcoming events</h3>
              {eventStatus && <p style={{ margin: 0, color: 'var(--gray-600)' }}>{eventStatus}</p>}
            </div>
            <div className="card-body">
              {events.length === 0 && !eventStatus && <p style={{ color: 'var(--gray-600)', margin: 0 }}>No events yet.</p>}
              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                {events.map(evt => (
                  <EventCard
                    key={evt.id}
                    id={evt.id}
                    title={evt.title}
                    date={evt.date}
                    time={evt.time}
                    location={evt.location || venue?.name}
                    promoted={evt.promoted}
                    category={evt.category}
                    admissionType={evt.admissionType}
                    hostName={evt.businessName || evt.hostDisplayName || null}
                    businessId={evt.businessId}
                    businessSlug={evt.businessSlug}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {claimModalOpen && (
        <div className="modal-overlay" onClick={() => setClaimModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Claim this venue</h3>
              <button className="modal-close" onClick={() => setClaimModalOpen(false)} aria-label="Close claim form">×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Proof type</label>
              <select className="form-input" value={claimProofType} onChange={(e) => setClaimProofType(e.target.value)}>
                <option value="manual">Manual</option>
                <option value="email_domain">Email domain</option>
                <option value="phone">Phone</option>
                <option value="document">Document</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Proof details</label>
              <input
                className="form-input"
                value={claimProofValue}
                onChange={(e) => setClaimProofValue(e.target.value)}
                placeholder="Work email, venue phone, or instructions"
              />
            </div>
            {claimStatusMsg && <p style={{ color: 'var(--gray-600)' }}>{claimStatusMsg}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setClaimModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitClaim}>Submit claim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
