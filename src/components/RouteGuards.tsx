import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isAdmin, isBusiness, isAuthenticated } from '../utils/roles'

export function NotAuthorized({ message }: { message?: string }) {
  return (
    <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
      <h1 style={{ margin: 0, fontSize: '2rem' }}>Not authorized</h1>
      <p style={{ color: 'var(--gray-600)' }}>{message || 'You do not have access to this page.'}</p>
    </div>
  )
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (!auth.isReady) return null
  if (!isAuthenticated(auth.idToken)) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth?next=${next}`} replace />
  }
  return <>{children}</>
}

export function RequireBusiness({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (!auth.isReady) return null
  if (!isAuthenticated(auth.idToken)) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth?next=${next}`} replace />
  }
  if (!isBusiness(auth.profile, auth.primaryBusinessId, auth.businessMemberships)) {
    return <NotAuthorized message="Business access is required for this area." />
  }
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (!auth.isReady) return null
  if (!isAuthenticated(auth.idToken)) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth?next=${next}`} replace />
  }
  if (!isAdmin(auth.profile)) {
    return <NotAuthorized message="Admin access is required for this area." />
  }
  return <>{children}</>
}
