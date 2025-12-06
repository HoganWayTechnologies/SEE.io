import React from 'react'

type WelcomeProps = {
  onNext: () => void
}

export default function Welcome({ onNext }: WelcomeProps) {
  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', display: 'grid', gap: '1rem' }}>
          <p style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--primary-blue)' }}>
            Step 1 of 6
          </p>
          <h1 style={{ margin: 0 }}>Welcome to SEE</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Your gateway to discovering local experiences, nightlife, and gatherings that match your vibe.
          </p>
          <button className="btn btn-primary" onClick={onNext} style={{ width: '100%' }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
