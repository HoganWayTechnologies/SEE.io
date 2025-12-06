import React from 'react'
import Seo from '../components/Seo'
import Footer from '../components/Footer'
import SiteNav from '../components/SiteNav'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')

export default function BusinessAgreementPage() {
  return (
    <div>
      <Seo
        title="Business Publishing Agreement"
        description="Lightweight SEE.io agreement for event organizers and publishers."
        canonical={`${SITE_URL}/legal/business-agreement`}
      />
      <SiteNav links={[{ to: '/discover', label: 'Discover' }]} />
      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1>Business Publishing Agreement</h1>
          <p style={{ color: 'var(--gray-600)' }}>Applies to organizers, venues, and agencies who publish on SEE.io.</p>
        </header>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>Representations</h3>
            <ul style={{ paddingLeft: '1.25rem' }}>
              <li>You own, license, or otherwise control the images, logos, and text submitted.</li>
              <li>You have obtained appropriate consents from performers, venues, and sponsors.</li>
              <li>You will promptly remove or update inaccurate information.</li>
            </ul>
          </div>
        </section>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>SEE.io Rights</h3>
            <ul style={{ paddingLeft: '1.25rem' }}>
              <li>We may feature, screenshot, or promote your event across SEE.io marketing channels.</li>
              <li>We may remove content that violates policies or receives valid complaints without notice.</li>
              <li>We may overlay SEE.io branding when promoting to maintain platform consistency.</li>
            </ul>
          </div>
        </section>
        <section className="card">
          <div className="card-body">
            <h3>Indemnity</h3>
            <p>
              Organizers agree to indemnify SEE.io for claims arising from the events they publish, including IP
              violations, contractual disputes, or attendee issues.
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
