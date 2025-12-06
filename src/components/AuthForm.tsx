import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

type AuthMode = 'signin' | 'signup'

interface AuthFormProps {
  mode: AuthMode
  onSuccess?: (profile?: any) => void
  className?: string
}

export default function AuthForm({ mode, onSuccess, className = '' }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [accountType, setAccountType] = useState<'user' | 'business'>('user')
  const [businessName, setBusinessName] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [acceptBusinessTerms, setAcceptBusinessTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const auth = useAuth()

  useEffect(() => {
    setError(null)
    setAccountType('user')
    setBusinessName('')
    setBusinessWebsite('')
    setAcceptBusinessTerms(false)
  }, [mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        if (accountType === 'business') {
          if (!businessName.trim()) throw new Error('Business name is required for business accounts.')
          if (!acceptBusinessTerms) throw new Error('Please agree to the business publishing terms.')
          await api.signupBusiness({
            email,
            password,
            displayName: displayName || null,
            business: {
              name: businessName,
              website: businessWebsite || null
            }
          })
        } else {
          await api.signupUser({
            email,
            password,
            displayName: displayName || null
          })
        }
      }

      const signinResponse = await api.signin({ email, password })
      const firebaseIdToken = signinResponse?.idToken
      const refreshToken = signinResponse?.refreshToken
      if (!firebaseIdToken || !refreshToken) throw new Error('Authentication failed to return session tokens.')

      const seeProfileResponse = await api.fetchProfile(firebaseIdToken)
      const aggregatedProfile = {
        ...seeProfileResponse,
        uid: seeProfileResponse?.uid
          || seeProfileResponse?.id
          || seeProfileResponse?.userId
          || signinResponse?.uid
      }

      try {
        await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: firebaseIdToken })
        })
      } catch (sessionErr) {
        console.warn('Session cookie setup failed (optional):', sessionErr)
      }

      auth.signIn(aggregatedProfile, firebaseIdToken, {
        refreshToken
      })
      onSuccess?.(aggregatedProfile)
    } catch (err: any) {
      setError(err?.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    // No Firebase session to revoke when using direct ID tokens
    try {
      await fetch('/api/session', { method: 'DELETE' })
    } catch (sessionErr) {
      console.warn('Session delete failed (optional):', sessionErr)
    }
    auth.signOut()
    onSuccess?.(null)
  }

  if (auth.profile) {
    return (
      <div className={`auth-form ${className}`}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <h3 className="card-title">Signed in</h3>
            <p style={{ marginTop: '0.5rem' }}>
              {auth.profile.displayName || auth.profile.email || 'Authenticated user'}
            </p>
            {auth.profile.email && (
              <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}>{auth.profile.email}</p>
            )}
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`auth-form ${className}`}>
      <form onSubmit={handleSubmit} className="auth-form-fields">
        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: 'var(--error-red)',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--error-red)',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email" className="form-label">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="form-input"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="form-input"
            required
            disabled={loading}
          />
        </div>

        {mode === 'signup' && (
          <>
            <div className="form-group">
              <label className="form-label">Account type</label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input
                    type="radio"
                    name="account-type"
                    value="user"
                    checked={accountType === 'user'}
                    onChange={() => setAccountType('user')}
                    disabled={loading}
                  />
                  <span>Discover events</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input
                    type="radio"
                    name="account-type"
                    value="business"
                    checked={accountType === 'business'}
                    onChange={() => setAccountType('business')}
                    disabled={loading}
                  />
                  <span>Publish events</span>
                </label>
              </div>
            </div>
            {accountType === 'business' && (
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-body">
                  <h4 className="card-title">Business details</h4>
                  <div className="form-group">
                    <label className="form-label">Business or organization name</label>
                    <input
                      className="form-input"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g., City Nightlife LLC"
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Website or social link</label>
                    <input
                      className="form-input"
                      value={businessWebsite}
                      onChange={(e) => setBusinessWebsite(e.target.value)}
                      placeholder="https://"
                      disabled={loading}
                    />
                  </div>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem', color: 'var(--gray-700)' }}>
                    <input
                      type="checkbox"
                      checked={acceptBusinessTerms}
                      onChange={(e) => setAcceptBusinessTerms(e.target.checked)}
                      disabled={loading}
                    />
                    <span>I own the rights to my content and agree to the business agreement.</span>
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'signup' && (
          <div className="form-group">
            <label htmlFor="displayName" className="form-label">Display name (optional)</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="How you'd like to appear"
              className="form-input"
              disabled={loading}
            />
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Working...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
