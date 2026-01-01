import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import { useAuth } from '../context/AuthContext'

export default function PublisherSettingsPage() {
  const auth = useAuth()
  const businessId = useMemo(() => {
    return (
      auth.primaryBusinessId ||
      auth.profile?.primaryBusinessId ||
      auth.profile?.businessId ||
      auth.profile?.business?.id ||
      null
    )
  }, [auth.primaryBusinessId, auth.profile])

  return (
    <div>
      <SiteNav
        activePath="/publisher/settings"
        links={[
          { to: '/publisher', label: 'Dashboard' },
          { to: '/publisher/events', label: 'Events' },
          { to: '/publisher/analytics', label: 'Analytics' },
          { to: '/publisher/settings', label: 'Settings' }
        ]}
      />

      <div className="container" style={{ padding: '2.5rem 0' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>Publisher settings</h1>
          <p style={{ color: 'var(--gray-600)' }}>Manage your business profile, payouts, and feature access.</p>
        </header>

        <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Business profile</h3>
              <p style={{ color: 'var(--gray-600)' }}>Update your public-facing business details and branding.</p>
              {businessId ? (
                <Link to={`/business/${businessId}`} className="btn btn-secondary">View profile</Link>
              ) : (
                <Link to="/profile" className="btn btn-secondary">Set up business</Link>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Payouts</h3>
              <p style={{ color: 'var(--gray-600)' }}>Connect payouts and review payment history.</p>
              <Link to="/host/payments" className="btn btn-secondary">Manage payouts</Link>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Feature flags</h3>
              <p style={{ color: 'var(--gray-600)' }}>See which beta features are enabled for your account.</p>
              <Link to="/settings" className="btn btn-secondary">Account settings</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
