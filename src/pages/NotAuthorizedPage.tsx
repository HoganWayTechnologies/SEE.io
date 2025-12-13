import React from 'react'
import SiteNav from '../components/SiteNav'
import { Link, useLocation } from 'react-router-dom'

export default function NotAuthorizedPage() {
  const location = useLocation()
  const lastPath = typeof window !== 'undefined' ? window.sessionStorage.getItem('see_forbidden_path') : null
  const message = lastPath ? `You tried to access ${lastPath}` : location.pathname
  return (
    <div>
      <SiteNav />
      <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Not authorized</h1>
        <p style={{ color: 'var(--gray-600)' }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-secondary">Go home</Link>
          <Link to="/auth" className="btn btn-primary">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
