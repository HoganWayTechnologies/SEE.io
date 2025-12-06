import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import { useAuth } from '../context/AuthContext'
import SiteNav from '../components/SiteNav'

type AuthMode = 'signin' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const auth = useAuth()
  const navigate = useNavigate()

  return (
    <div>
      {/* Navigation */}
      <SiteNav
        links={[
          { to: '/discover', label: 'Discover' },
          { to: '/saved', label: 'Saved' },
          { to: '/tickets', label: 'My Tickets' }
        ]}
      />

      {/* Auth Section */}
      <div className="container" style={{ padding: '4rem 0', maxWidth: '500px' }}>
        <div className="card">
          <div className="card-body">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </h1>
              <p style={{ color: 'var(--gray-600)' }}>
                {mode === 'signin'
                  ? 'Welcome back! Sign in to your account'
                  : 'Join SEE.io to discover amazing events'
                }
              </p>
            </div>

            <AuthForm mode={mode} onSuccess={() => navigate('/onboarding')} />

            <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--gray-200)' }}>
              <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
                {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                style={{ width: '100%' }}
              >
                {mode === 'signin' ? 'Create Account' : 'Sign In Instead'}
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--gray-600)' }}>
          <p style={{ fontSize: '0.875rem' }}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {auth.profile && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-body" style={{ textAlign: 'center' }}>
              <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>Signed In</h3>
              <p style={{ marginBottom: '0.5rem' }}>
                {auth.profile.displayName || auth.profile.email || auth.profile.uid}
              </p>
              <Link to="/" className="btn btn-primary" style={{ width: '100%' }}>
                Continue to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
