import React from 'react'
import Seo from '../components/Seo'
import Footer from '../components/Footer'
import SiteNav from '../components/SiteNav'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')

export default function TermsPage() {
  return (
    <div>
      <Seo
        title="Terms of Service"
        description="SEE.io Terms of Service for attendees, publishers, and businesses."
        canonical={`${SITE_URL}/legal/terms`}
      />
      <SiteNav links={[{ to: '/discover', label: 'Discover' }]} />
      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1>Terms of Service</h1>
          <p style={{ color: 'var(--gray-600)' }}>Last updated: {new Date().toLocaleDateString()}</p>
        </header>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>Scope</h3>
            <p>
              These Terms govern use of SEE.io by event seekers (“Members”) and organizations publishing events
              (“Businesses”). By using SEE.io you agree to these terms and our Privacy Policy.
            </p>
          </div>
        </section>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>Use Disclaimers & Hosting Liability</h3>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--gray-700)' }}>
              <li>SEE.io hosts user and business submissions and is not the organizer of listed events.</li>
              <li>We do not guarantee accuracy of times, venues, or ticket availability.</li>
              <li>Businesses are solely responsible for complying with local regulations, permits, and insurance.</li>
            </ul>
          </div>
        </section>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>User Content Rules</h3>
            <p>When uploading event descriptions, logos, or images you agree that:</p>
            <ul style={{ paddingLeft: '1.25rem' }}>
              <li>You own or have permission to publish the content.</li>
              <li>You will not upload malware, spam, or misleading promotions.</li>
              <li>You will respect privacy rights and obtain approvals for personally identifiable imagery.</li>
            </ul>
            <h4>Prohibited Content</h4>
            <ul style={{ paddingLeft: '1.25rem' }}>
              <li>Incitement of violence, hate speech, or discriminatory targeting.</li>
              <li>Illegal goods/services, counterfeit tickets, or scams.</li>
              <li>Explicit adult content outside of clearly marked 21+ nightlife events.</li>
            </ul>
          </div>
        </section>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>Business Responsibilities</h3>
            <p>
              Businesses publishing on SEE.io attest that they own the rights to all submitted media and text, and grant
              SEE.io a non-exclusive license to host, promote, and create derivative marketing (including screenshots).
              SEE.io may remove content that violates these terms or receives abuse reports.
            </p>
          </div>
        </section>
        <section className="card">
          <div className="card-body">
            <h3>Liability</h3>
            <p>
              SEE.io is provided “as-is” and is not liable for indirect, incidental, or consequential damages. Total
              liability is limited to the greater of $50 USD or the amount paid to SEE.io within the past 12 months.
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
