import React, { useState } from 'react'
import { useOnboardingApi } from '../hooks/useOnboardingApi'

type BusinessIntroProps = {
  onNext: (choice: 'individual' | 'business') => void
}

export default function BusinessIntro({ onNext }: BusinessIntroProps) {
  const [loading, setLoading] = useState<'individual' | 'business' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { saveProgress } = useOnboardingApi()

  const handleSelect = async (type: 'individual' | 'business') => {
    setLoading(type)
    setError(null)
    try {
      await saveProgress('business_intro')
      onNext(type)
    } catch (err: any) {
      setError(err?.message || 'Unable to continue right now.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-body" style={{ display: 'grid', gap: '1rem', textAlign: 'center' }}>
          <p style={{ textTransform: 'uppercase', color: 'var(--primary-blue)', fontSize: '0.85rem', letterSpacing: '0.08em' }}>
            Step 3
          </p>
          <h1 style={{ margin: 0 }}>Tell us about your role</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Are you creating events for yourself or on behalf of a business or venue?
          </p>

          {error && (
            <div style={{ background: '#fee2e2', color: 'var(--error-red)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={() => handleSelect('individual')}
            disabled={Boolean(loading)}
          >
            {loading === 'individual' ? 'Continuing…' : "I'm an individual"}
          </button>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => handleSelect('business')}
            disabled={Boolean(loading)}
          >
            {loading === 'business' ? 'Continuing…' : "I'm a business / organization"}
          </button>
        </div>
      </div>
    </div>
  )
}
