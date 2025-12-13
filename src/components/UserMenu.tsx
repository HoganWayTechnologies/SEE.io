import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isAdmin, isBusiness } from '../utils/roles'

export default function UserMenu() {
  const auth = useAuth()
  const [open, setOpen] = useState(false)

  if (!auth.idToken || !auth.profile) {
    return (
      <Link to="/auth" className="btn btn-primary">Sign In</Link>
    )
  }

  const initials = auth.profile.displayName
    ? auth.profile.displayName.split(' ').map((part: string) => part[0]).slice(0, 2).join('').toUpperCase()
    : (auth.profile.email?.[0] || 'U').toUpperCase()

  return (
    <div className="user-menu" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <div className="user-avatar">{initials}</div>
      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-name">{auth.profile.displayName || auth.profile.email}</div>
            <div className="user-email">{auth.profile.email}</div>
          </div>
          <Link to="/saved" className="user-menu-item">Saved</Link>
          <Link to="/tickets" className="user-menu-item">My Tickets</Link>
          <Link to="/calendar" className="user-menu-item">Calendar</Link>
          <Link to="/inbox" className="user-menu-item">Inbox</Link>
          {isBusiness(auth.profile, auth.primaryBusinessId, auth.businessMemberships) && (
            <>
              <Link to="/my-events" className="user-menu-item">My Events</Link>
              <Link to="/host/analytics" className="user-menu-item">Host Analytics</Link>
            </>
          )}
          <Link to="/profile" className="user-menu-item">Profile</Link>
          <Link to="/settings" className="user-menu-item">Settings</Link>
          <Link to="/preferences" className="user-menu-item">Preferences</Link>
          {isBusiness(auth.profile, auth.primaryBusinessId, auth.businessMemberships) && (
            <Link to="/publisher" className="user-menu-item">Publisher Console</Link>
          )}
          {isAdmin(auth.profile) && <Link to="/reports" className="user-menu-item">Admin</Link>}
          <button className="user-menu-item" type="button" onClick={() => auth.signOut()}>Sign out</button>
        </div>
      )}
    </div>
  )
}
