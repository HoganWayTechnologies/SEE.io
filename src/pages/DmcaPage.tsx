import React from 'react'
import Seo from '../components/Seo'
import Footer from '../components/Footer'
import SiteNav from '../components/SiteNav'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')

export default function DmcaPage() {
  return (
    <div>
      <Seo
        title="DMCA Takedown Policy"
        description="Instructions for reporting copyright violations on SEE.io."
        canonical={`${SITE_URL}/legal/dmca`}
      />
      <SiteNav links={[{ to: '/discover', label: 'Discover' }]} />
      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1>DMCA Takedown Policy</h1>
          <p style={{ color: 'var(--gray-600)' }}>Use this process to report copyrighted material posted on SEE.io.</p>
        </header>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>What You Should Report</h3>
            <p>
              SEE.io hosts event images, business logos, and user-submitted “moments.” If your copyright is infringed by
              any of these assets, submit a takedown notice.
            </p>
          </div>
        </section>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>How to Submit</h3>
            <p>Email dmca@see.io with the following:</p>
            <ul style={{ paddingLeft: '1.25rem' }}>
              <li>Your full name, company (if applicable), and contact information.</li>
              <li>Links to the infringing SEE.io content.</li>
              <li>Proof of ownership (registration number or statement under penalty of perjury).</li>
              <li>A statement authorizing SEE.io to remove the content.</li>
            </ul>
          </div>
        </section>
        <section className="card">
          <div className="card-body">
            <h3>Counter-Notices</h3>
            <p>
              If you believe your content was removed in error, email dmca@see.io with proof of rights. We may restore
              content within 10 business days unless the complainant pursues legal action.
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
