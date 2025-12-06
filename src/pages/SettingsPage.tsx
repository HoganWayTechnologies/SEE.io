import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { updateSocxalProfile, resetSocxalPassword, logoutAllSocxalSessions } from '../../lib/socxal'
import { useAuth } from '../context/AuthContext'
import SiteNav from '../components/SiteNav'

const notificationOptions = [
  { label: 'Email me when events I follow are updated', key: 'followedUpdates', enabled: true },
  { label: 'Email me weekly personalized recommendations', key: 'weeklyDigest', enabled: false },
  { label: 'Notify me about organizer toolkit tips', key: 'organizerTips', enabled: true }
]

export default function SettingsPage() {
  const auth = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
        setDisplayName(auth.profile?.displayName || '')
        setEmail(auth.profile?.email || '')
  }, [auth.profile])

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = auth.socxalToken
    if (!token) {
      setStatus('Please sign in to update profile information.')
      return
    }
    try {
      setStatus('Saving profile...')
      await updateSocxalProfile(token, { displayName, phoneNumber: phone })
      setStatus('Profile updated!')
    } catch (err: any) {
      setStatus(err?.message || 'Failed to update profile')
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setStatus('Add an email address before resetting password.')
      return
    }
    try {
      setStatus('Sending reset email...')
      await resetSocxalPassword(email)
      setStatus('Password reset email sent.')
    } catch (err: any) {
      setStatus(err?.message || 'Failed to trigger reset email')
    }
  }

  const handleLogoutAll = async () => {
    const token = auth.socxalToken
    if (!token) {
      setStatus('Please sign in to log out other sessions.')
      return
    }
    try {
      setStatus('Logging out all sessions...')
      await logoutAllSocxalSessions(token)
      setStatus('All sessions cleared.')
    } catch (err: any) {
      setStatus(err?.message || 'Failed to log out sessions')
    }
  }

  return (
    <div>
      <SiteNav
        activePath="/settings"
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/profile', label: 'Profile' },
          { to: '/settings', label: 'Settings' },
          { to: '/preferences', label: 'Preferences' },
          { to: '/saved', label: 'Saved' },
          { to: '/tickets', label: 'My Tickets' }
        ]}
      />

      <div className="container" style={{ padding: '3rem 0', maxWidth: '720px' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Account Settings</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Eventually this form will drive `/v1/users/{'{' }id{'}'}`, `/v1/users/{'{' }id{'}'}/preferences`, Socxal `/api/Auth/update-profile`,
            and session endpoints for password/email changes. For now, it's illustrative.
          </p>
        </header>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 className="card-title">Profile Details</h3>
            <form style={{ display: 'grid', gap: '1rem' }} onSubmit={handleProfileSave}>
              <div>
                <label className="form-label">Display Name</label>
                <input className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Contact Email</label>
                <input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Phone (optional)</label>
                <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 010-2030" />
              </div>
              <button className="btn btn-primary" type="submit">Save Changes</button>
            </form>
            {status && <p style={{ marginTop: '0.5rem', color: 'var(--gray-600)' }}>{status}</p>}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 className="card-title">Notifications</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {notificationOptions.map(option => (
                <li key={option.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <span>{option.label}</span>
                  <label className="switch">
                    <input type="checkbox" defaultChecked={option.enabled} />
                    <span className="slider" />
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title">Security</h3>
            <p>Use Socxal `/api/Auth/signIn`, `/api/Auth/reset-password`, and Firebase session endpoints to power these actions.</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" type="button" onClick={handleResetPassword}>Change Password</button>
              <button className="btn btn-secondary" type="button" onClick={handleLogoutAll}>Log out all sessions</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
