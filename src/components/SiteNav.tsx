import React, { useEffect, useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import UserMenu from './UserMenu'
import { useAuth } from '../context/AuthContext'
import { isAdmin, isBusiness } from '../utils/roles'

type NavLinkItem = {
  to: string
  label: string
  key?: string
}

export type SiteNavProps = {
  links?: NavLinkItem[]
  activePath?: string
  searchSlot?: React.ReactNode
}

const defaultLinks: NavLinkItem[] = [
  { to: '/discover', label: 'Discover' },
  { to: '/playlists', label: 'Playlists' },
  { to: '/saved', label: 'Saved' }
]

export default function SiteNav({ links = defaultLinks, activePath, searchSlot }: SiteNavProps) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const resolvedActive = activePath || location.pathname
  const auth = useAuth()
  const computedLinks = useMemo(() => {
    const merged = [...links]
    if (isBusiness(auth.profile, auth.primaryBusinessId, auth.businessMemberships)) {
      const hostLink = '/host/analytics'
      if (!merged.some(link => link.to === hostLink)) {
        merged.push({ to: hostLink, label: 'Host Portal', key: 'host-portal' })
      }
    }
    if (isAdmin(auth.profile)) {
      const adminLink = '/reports'
      if (!merged.some(link => link.to === adminLink)) {
        merged.push({ to: adminLink, label: 'Admin', key: 'admin' })
      }
    }
    if (!auth.idToken) {
      const protectedPrefixes = [
        '/saved',
        '/tickets',
        '/profile',
        '/settings',
        '/preferences',
        '/inbox',
        '/calendar',
        '/host',
        '/publisher',
        '/my-events',
        '/reports'
      ]
      return merged.filter(link => !protectedPrefixes.some(prefix => link.to.startsWith(prefix)))
    }
    return merged
  }, [links, auth])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, activePath])

  return (
    <nav className="nav">
      <div className="container nav-container">
        <Link to="/" className="nav-brand">SEE.io</Link>

        <div className="nav-center">
          {searchSlot && (
            <div className="nav-search-wrapper nav-search-desktop">
              {searchSlot}
            </div>
          )}
          <div className="nav-link-list nav-link-list-desktop">
            {computedLinks.map(link => {
              const key = link.key || link.to
              const isActive = resolvedActive === key || resolvedActive.startsWith(link.to)
              return (
                <Link key={key} to={link.to} className={`nav-link ${isActive ? 'active' : ''}`}>
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="nav-actions nav-actions-desktop">
          {auth.idToken && <NotificationBell />}
          <UserMenu />
        </div>

        <button
          className="nav-hamburger"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
          {searchSlot && (
            <div className="nav-search-wrapper nav-search-mobile">
              {searchSlot}
            </div>
          )}
          <div className="nav-link-list nav-link-list-mobile">
            {computedLinks.map(link => {
              const key = link.key || link.to
              const isActive = resolvedActive === key || resolvedActive.startsWith(link.to)
              return (
                <Link key={key} to={link.to} className={`nav-link ${isActive ? 'active' : ''}`}>
                  {link.label}
                </Link>
              )
            })}
          </div>
          <div className="nav-actions nav-actions-mobile">
            {auth.idToken && <NotificationBell />}
            <UserMenu />
          </div>
        </div>
      </div>
      {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)} />}
    </nav>
  )
}
