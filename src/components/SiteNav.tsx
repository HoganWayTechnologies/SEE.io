import React, { useEffect, useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import UserMenu from './UserMenu'
import { useAuth } from '../context/AuthContext'

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
    if (auth?.primaryBusinessId) {
      const businessLink = `/business/${auth.primaryBusinessId}`
      if (!merged.some(link => link.to === businessLink)) {
        merged.push({ to: businessLink, label: 'My Business', key: 'my-business' })
      }
    }
    return merged
  }, [links, auth?.primaryBusinessId])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, activePath])

  return (
    <nav className="nav">
      <div className="container nav-container">
        <Link to="/" className="nav-brand">SEE.io</Link>

        {searchSlot && (
          <div className="nav-search-wrapper">
            {searchSlot}
          </div>
        )}

        <button
          className="nav-hamburger"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
          {computedLinks.map(link => {
            const key = link.key || link.to
            const isActive = resolvedActive === key || resolvedActive.startsWith(link.to)
            return (
              <Link key={key} to={link.to} className={`nav-link ${isActive ? 'active' : ''}`}>
                {link.label}
              </Link>
            )
          })}
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
