import React from 'react'
import Seo from '../components/Seo'
import Footer from '../components/Footer'
import SiteNav from '../components/SiteNav'

const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://see.io').replace(/\/$/, '')

export default function StripeTermsPage() {
  return (
    <div>
      <Seo
        title="Stripe & Payments Terms"
        description="SEE.io supplemental terms for ticketing and promotional purchases powered by Stripe."
        canonical={`${SITE_URL}/legal/stripe-terms`}
      />
      <SiteNav links={[{ to: '/discover', label: 'Discover' }]} />
      <div className="container" style={{ padding: '3rem 0' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1>Stripe & Payments Terms</h1>
          <p style={{ color: 'var(--gray-600)' }}>Applies to organizers using SEE.io ticketing and promotional checkout.</p>
        </header>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>Promotional Purchases</h3>
            <p>
              SEE.io ticket purchases run through Stripe. Organizers must clearly label promotional or discounted
              tickets. SEE.io may highlight Stripe-sponsored offers and must disclose if a purchase is promotional,
              limited, or non-refundable.
            </p>
          </div>
        </section>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3>Refund Policy</h3>
            <p>
              Organizers must publish their refund policy on the event page. If no policy is provided, SEE.io defaults to
              “all sales final” but may issue refunds in cases of fraud or event cancellation. Stripe fees are
              non-refundable unless required by law.
            </p>
          </div>
        </section>
        <section className="card">
          <div className="card-body">
            <h3>Compliance</h3>
            <ul style={{ paddingLeft: '1.25rem' }}>
              <li>You agree to Stripe’s Connected Account Agreement.</li>
              <li>You will not process prohibited goods or high-risk categories.</li>
              <li>You will respond to chargebacks within 5 business days.</li>
            </ul>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
