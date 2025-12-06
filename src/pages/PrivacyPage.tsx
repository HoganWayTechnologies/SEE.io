import React from 'react'
import Seo from '../components/Seo'
import Footer from '../components/Footer'
import SiteNav from '../components/SiteNav'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')

export default function PrivacyPage() {
  return (
    <div>
      <Seo
        title="Privacy Policy"
        description="SEE.io privacy policy covering CCPA, GDPR, and Google Ads requirements."
        canonical={`${SITE_URL}/legal/privacy`}
      />
      <SiteNav links={[{ to: '/discover', label: 'Discover' }]} />
      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1>Privacy Policy</h1>
          <p style={{ color: 'var(--gray-600)' }}>Compliant with CCPA, GDPR basics, and Google Ads data policies.</p>
        </header>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>Information We Collect</h3>
            <ul style={{ paddingLeft: '1.25rem' }}>
              <li>Account data: name, email, display name, phone (optional).</li>
              <li>Usage data: page views, playlist selections, favorite categories.</li>
              <li>Uploads: event images, logos, descriptions, and comments.</li>
            </ul>
          </div>
        </section>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>Cookies & Analytics</h3>
            <p>
              SEE.io uses first-party cookies for session management and analytics cookies to understand event discovery
              trends. You can opt-out by adjusting browser settings or contacting support@see.io.
            </p>
          </div>
        </section>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>Data Rights</h3>
            <p>
              California residents (CCPA) and EU/UK residents (GDPR) may request data access, deletion, or correction via
              privacy@see.io. We respond within 30 days and never sell personal data.
            </p>
          </div>
        </section>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>Uploads & User Generated Content</h3>
            <p>
              Event organizers control the content they upload. SEE.io stores the files securely and processes them for
              thumbnails, analytics, and marketing previews. Removing an event deletes associated media unless required
              by law to retain.
            </p>
          </div>
        </section>
        <section className="card">
          <div className="card-body">
            <h3>Sharing & Google Ads</h3>
            <p>
              We may share limited data with payment processors (Stripe) and ad networks to measure success. Google Ads
              tags are configured for limited data processing and do not include sensitive categories.
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
