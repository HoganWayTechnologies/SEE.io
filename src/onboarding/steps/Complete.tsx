import React, { useState } from 'react'
import { useOnboardingApi } from '../hooks/useOnboardingApi'

type CompleteProps = {
  onFinish: () => void
}

export default function Complete({ onFinish }: CompleteProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { saveProgress } = useOnboardingApi()

  const handleFinish = async () => {
    setLoading(true)
    setError(null)
    try {
      await saveProgress('complete')
      onFinish()
    } catch (err: any) {
      setError(err?.message || 'Unable to finish onboarding. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', display: 'grid', gap: '1rem' }}>
          <p style={{ textTransform: 'uppercase', color: 'var(--primary-blue)', fontSize: '0.85rem', letterSpacing: '0.08em' }}>
            Final step
          </p>
          <h1 style={{ margin: 0 }}>You’re all set!</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            We’ve tailored SEE.io to your interests and location. Ready to start discovering?
          </p>
          {error && (
            <div style={{ background: '#fee2e2', color: 'var(--error-red)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              {error}
            </div>
          )}
          <button className="btn btn-primary" onClick={handleFinish} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Finishing…' : 'Enter SEE'}
          </button>
        </div>
      </div>
    </div>
  )
}
