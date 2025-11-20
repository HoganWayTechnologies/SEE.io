import React, { useEffect, useState } from 'react'
import { socxalLogin, socxalRegister, exchangeToFirebase } from '../../lib/socxal'
import { api } from '../services/api'

type AuthMode = 'signin' | 'signup'

interface AuthFormProps {
  mode: AuthMode
  onSuccess?: (profile?: any) => void
  className?: string
}

const saveProfileLocally = (profile: any, idToken: string) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem('seeProfile', JSON.stringify(profile || null))
    window.localStorage.setItem('seeIdToken', idToken || '')
  } catch {
    // ignore quota errors
  }
}

export default function AuthForm({ mode, onSuccess, className = '' }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any | null>(null)

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

      const seeProfile = await api.fetchProfile(firebaseIdToken)
      setProfile(seeProfile)
      saveProfileLocally(seeProfile, firebaseIdToken)
      onSuccess?.(seeProfile)
    } catch (err: any) {
      setError(err?.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    // No Firebase session to revoke when using direct ID tokens
    setProfile(null)
    saveProfileLocally(null, '')
    onSuccess?.(null)
  }

  if (profile) {
    return (
      <div className={`auth-form ${className}`}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <h3 className="card-title">Signed in</h3>
            <p style={{ marginTop: '0.5rem' }}>
              {profile.displayName || profile.email || 'Authenticated user'}
            </p>
            {profile.email && (
              <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}>{profile.email}</p>
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
