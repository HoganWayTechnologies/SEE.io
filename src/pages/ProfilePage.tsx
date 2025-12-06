import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api, Event, UserBusinessMembership } from '../services/api'
import EventGrid from '../components/EventGrid'
import SiteNav from '../components/SiteNav'

export default function ProfilePage() {
  const auth = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionStatus, setSessionStatus] = useState<string | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [eventsStatus, setEventsStatus] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<UserBusinessMembership[]>([])
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null)
  const [businessForm, setBusinessForm] = useState({
    name: '',
    slug: '',
    type: '',
    description: '',
    website: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    state: '',
    country: 'US'
  })
  const [upgradeStatus, setUpgradeStatus] = useState<string | null>(null)

  const userId = useMemo(() => auth.profile?.uid || auth.profile?.id || auth.profile?.userId || auth.profile?.localId, [auth.profile])
  const detectedBusinessId = useMemo(() => {
    if (auth.primaryBusinessId) return auth.primaryBusinessId
    if (auth.businessMemberships?.length) {
      return auth.businessMemberships[0]?.businessId || null
    }
    if (memberships.length) {
      return memberships[0]?.businessId || memberships[0]?.business?.id || null
    }
    if (!auth.profile) return null
    return (
      auth.profile.businessId ||
      auth.profile.business?.id ||
      auth.profile.business?.businessId ||
      auth.profile.publisher?.businessId ||
      auth.profile.businesses?.[0]?.id ||
      null
    )
  }, [auth.primaryBusinessId, auth.businessMemberships, memberships, auth.profile])
  const isBusinessAccount =
    (Array.isArray(auth.profile?.roles) && auth.profile.roles.includes('publisher')) ||
    Boolean(detectedBusinessId || auth.businessMemberships?.length || memberships.length)

  useEffect(() => {
    const loadSessions = async () => {
      if (!userId || !auth.idToken) return
      try {
        const resp = await api.fetchUserSessions(userId, auth.idToken)
        setSessions(resp || [])
        setSessionStatus(resp?.length ? null : 'No active sessions.')
      } catch (err: any) {
        setSessions([])
        setSessionStatus(err?.message || 'Could not load sessions')
      }
    }
    loadSessions()
  }, [userId, auth.idToken])

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const resp = await api.searchEvents({ take: 6, status: 'active' })
        setUpcomingEvents(resp.items || [])
        setEventsStatus(resp.items?.length ? null : 'No featured events right now.')
      } catch (err: any) {
        setUpcomingEvents([])
        setEventsStatus('Could not load events')
      }
    }
    loadEvents()
  }, [])

  useEffect(() => {
    const loadMemberships = async () => {
      if (!userId || !auth.idToken) {
        setMemberships([])
        setMembershipStatus(null)
        return
      }
      try {
        const resp = await api.fetchUserBusinessMemberships(userId, auth.idToken)
        setMemberships(resp || [])
        setMembershipStatus(resp?.length ? null : 'No business memberships yet.')
      } catch (err: any) {
        setMemberships([])
        setMembershipStatus(err?.message || 'Unable to load business memberships.')
      }
    }
    loadMemberships()
  }, [userId, auth.idToken])

  if (!auth.idToken || !auth.profile) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1>Please sign in to view your profile.</h1>
        <Link to="/auth" className="btn btn-primary">Sign In</Link>
      </div>
    )
  }

  const linkedAccounts = [
    { name: 'Socxal', status: 'Linked', lastSync: 'moments ago' }
  ]

  const mockStats = [
    { label: 'Events Attended', value: auth.profile.attendedCount || 0 },
    { label: 'Saved Events', value: auth.profile.savedCount || 0 },
    { label: 'Organized Events', value: auth.profile.organizedCount || 0 }
  ]

  return (
    <div>
      <SiteNav
        activePath="/profile"
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/profile', label: 'Profile' },
          { to: '/settings', label: 'Settings' },
          { to: '/preferences', label: 'Preferences' },
          { to: '/saved', label: 'Saved' },
          { to: '/tickets', label: 'My Tickets' }
        ]}
      />

      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Account Overview</h1>
          <p style={{ color: 'var(--gray-600)', maxWidth: '640px' }}>
            View the identity and preference data tied to your SEE.io account.
          </p>
        </header>

        <section className="grid" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Identity</h3>
              <p><strong>Name:</strong> {auth.profile.displayName || 'Unknown'}</p>
              <p><strong>Email:</strong> {auth.profile.email}</p>
              <p><strong>Socxal ID:</strong> {auth.profile.socxalId || auth.profile.uid}</p>
              <p><strong>User ID:</strong> {userId}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Preferences Snapshot</h3>
              <p><strong>Default City:</strong> {auth.profile.defaultCity || 'Not set'}</p>
              <p><strong>Categories:</strong> {(auth.profile.favoriteCategories || []).join(', ') || 'None selected'}</p>
              <p><strong>Linked Accounts:</strong></p>
              <ul>
                {linkedAccounts.map(account => (
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

        {!isBusinessAccount && (
          <section style={{ marginTop: '2rem' }}>
            <div className="card">
              <div className="card-body">
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Upgrade to a business account</h2>
                <p style={{ color: 'var(--gray-600)' }}>
                  Publish events, manage tickets, and customize landing pages. Upgrades are reviewed to keep SEE.io safe for attendees.
                </p>
                <div style={{ display: 'grid', gap: '0.75rem', margin: '1rem 0' }}>
                  <div className="form-group">
                    <label className="form-label">Business or organizer name</label>
                    <input
                      className="form-input"
                      value={businessForm.name}
                      onChange={(e) => {
                        const value = e.target.value
                        setBusinessForm(prev => ({
                          ...prev,
                          name: value,
                          slug: prev.slug || value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                        }))
                      }}
                      placeholder="e.g., Downtown Festival Group"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Slug / vanity URL</label>
                    <input
                      className="form-input"
                      value={businessForm.slug}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                      placeholder="downtown-festival-group"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business type</label>
                    <input
                      className="form-input"
                      value={businessForm.type}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, type: e.target.value }))}
                      placeholder="nightlife, music, venue, promoter…"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description / bio</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={businessForm.description}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Tell attendees what you host."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Website or social link (optional)</label>
                    <input
                      className="form-input"
                      value={businessForm.website}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Contact email</label>
                      <input
                        className="form-input"
                        value={businessForm.contactEmail || auth.profile?.email || ''}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                        placeholder="contact@yourbiz.com"
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Contact phone</label>
                      <input
                        className="form-input"
                        value={businessForm.contactPhone}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                        placeholder="+1 555 010 1234"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input
                      className="form-input"
                      value={businessForm.address}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main St"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">City</label>
                      <input
                        className="form-input"
                        value={businessForm.city}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="form-group" style={{ width: '140px' }}>
                      <label className="form-label">State / Region</label>
                      <input
                        className="form-input"
                        value={businessForm.state}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                    <div className="form-group" style={{ width: '140px' }}>
                      <label className="form-label">Country</label>
                      <input
                        className="form-input"
                        value={businessForm.country}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, country: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!auth.idToken || !userId) {
                      setUpgradeStatus('Sign in again to request an upgrade.')
                      return
                    }
                    if (!businessForm.name.trim()) {
                      setUpgradeStatus('Business name is required.')
                      return
                    }
                    if (!businessForm.slug.trim()) {
                      setUpgradeStatus('Slug is required.')
                      return
                    }
                    try {
                      setUpgradeStatus('Submitting upgrade request…')
                      await api.requestBusinessUpgrade(userId, auth.idToken, {
                        name: businessForm.name.trim(),
                        slug: businessForm.slug.trim(),
                        type: businessForm.type.trim() || undefined,
                        description: businessForm.description.trim() || undefined,
                        website: businessForm.website.trim() || undefined,
                        contactEmail: (businessForm.contactEmail || auth.profile?.email || '').trim() || undefined,
                        contactPhone: businessForm.contactPhone.trim() || undefined,
                        address: businessForm.address.trim() || undefined,
                        city: businessForm.city.trim() || undefined,
                        state: businessForm.state.trim() || undefined,
                        country: businessForm.country.trim() || undefined
                      })
                      setUpgradeStatus('Thanks! We are reviewing your account. You will get access soon.')
                    } catch (err: any) {
                      setUpgradeStatus(err?.message || 'Upgrade request failed.')
                    }
                  }}
                >
                  Request business access
                </button>
                {upgradeStatus && <p style={{ marginTop: '0.75rem', color: 'var(--gray-600)' }}>{upgradeStatus}</p>}
              </div>
            </div>
          </section>
        )}

        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Active Sessions</h2>
          <div className="card">
            <div className="card-body">
              {sessionStatus && <p style={{ color: 'var(--gray-600)' }}>{sessionStatus}</p>}
              {!sessionStatus && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-200)' }}>
                      <th style={{ padding: '0.5rem 0' }}>Device</th>
                      <th>Location</th>
                      <th>Last active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session, index) => (
                      <tr key={`${session.device}-${index}`} style={{ borderBottom: index === sessions.length - 1 ? 'none' : '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '0.5rem 0' }}>{session.device || session.userAgent || 'Unknown'}</td>
                        <td>{session.location || 'Unknown'}</td>
                        <td>{session.lastActive || session.lastSeen || 'Unknown'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Upcoming Events</h2>
          {eventsStatus && <p style={{ color: 'var(--gray-600)' }}>{eventsStatus}</p>}
          {!eventsStatus && (
            <EventGrid events={upcomingEvents} loading={false} emptyMessage="No upcoming events." />
          )}
        </section>
      </div>
    </div>
  )
}
