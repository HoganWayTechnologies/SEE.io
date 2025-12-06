import React from 'react'
import Seo from '../components/Seo'
import Footer from '../components/Footer'
import SiteNav from '../components/SiteNav'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')

export default function TrademarksPage() {
  return (
    <div>
      <Seo
        title="Trademarks & Brand Use"
        description="SEE.io trademark guidance and suggested search terms."
        canonical={`${SITE_URL}/legal/trademarks`}
      />
      <SiteNav links={[{ to: '/discover', label: 'Discover' }]} />
      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1>Trademarks & Usage</h1>
          <p style={{ color: 'var(--gray-600)' }}>Guidance for referencing SEE.io and Socxal Event Engine.</p>
        </header>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>Recommended Searches</h3>
            <p>Before launching campaigns, search for the following brand names:</p>
            <ul style={{ paddingLeft: '1.25rem' }}>
              <li>“SEE Event Engine”</li>
              <li>“Socxal Event Engine (SEE)”</li>
              <li>“SEE.io”</li>
            </ul>
            <p>
              If you find conflicting marks, contact legal@see.io. We monitor USPTO and global databases but appreciate
              partner diligence.
            </p>
          </div>
        </section>
        <section className="card">
          <div className="card-body">
            <h3>Brand Usage</h3>
            <ul style={{ paddingLeft: '1.25rem' }}>
              <li>Do not alter SEE.io logos or imply endorsement without permission.</li>
              <li>Use “powered by SEE.io” or “listed on SEE.io” phrasing for co-marketing.</li>
              <li>Contact legal@see.io for press kits or custom assets.</li>
            </ul>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
