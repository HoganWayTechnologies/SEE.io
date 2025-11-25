import React, { useEffect, useState } from 'react'
import { socxalLogin, socxalRegister, exchangeToFirebase } from '../../lib/socxal'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const auth = useAuth()

  useEffect(() => {
    setError(null)
  }, [mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const resp = mode === 'signin'
        ? await socxalLogin(email, password)
        : await socxalRegister(email, password, displayName || undefined)

      const accessToken = resp?.accessToken
      if (!accessToken) throw new Error('Socxal did not return an access token')

      const exchange = await exchangeToFirebase(accessToken)
      const firebaseIdToken = exchange?.firebaseToken || exchange?.idToken
      if (!firebaseIdToken) throw new Error('Exchange to Firebase failed')

      const seeProfileResponse = await api.fetchProfile(firebaseIdToken)
      const aggregatedProfile = {
        ...seeProfileResponse,
        uid: seeProfileResponse?.uid
          || seeProfileResponse?.id
          || seeProfileResponse?.userId
          || exchange?.uid
          || resp.raw?.localId
          || resp.raw?.uid
          || resp.user?.id
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

      auth.signIn(aggregatedProfile, firebaseIdToken, accessToken)
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
