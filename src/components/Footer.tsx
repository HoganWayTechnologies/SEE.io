import React from 'react'
import { Link } from 'react-router-dom'

const legalLinks = [
  { label: 'Terms of Service', to: '/legal/terms' },
  { label: 'Privacy Policy', to: '/legal/privacy' },
  { label: 'DMCA Policy', to: '/legal/dmca' },
  { label: 'Business Agreement', to: '/legal/business-agreement' },
  { label: 'Stripe Terms', to: '/legal/stripe-terms' },
  { label: 'Trademarks', to: '/legal/trademarks' }
]

const socialLinks = [
  { label: 'X / Twitter', href: 'https://twitter.com/seeio' },
  { label: 'Instagram', href: 'https://instagram.com/seeio' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/seeio' }
]

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--gray-900)', color: 'var(--white)', marginTop: '4rem' }}>
      <div className="container" style={{ padding: '2.5rem 0', display: 'grid', gap: '1.5rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>SEE.io</h4>
          <p style={{ margin: '0.5rem 0 0 0', color: 'rgba(255,255,255,0.75)' }}>
            Curated events, publisher tools, and personalized discovery.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem 2rem' }}>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Legal</strong>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {legalLinks.map(link => (
                <li key={link.to} style={{ marginBottom: '0.35rem' }}>
                  <Link to={link.to} className="nav-link" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Follow</strong>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {socialLinks.map(link => (
                <li key={link.href} style={{ marginBottom: '0.35rem' }}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
          © {new Date().getFullYear()} SEE.io. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
