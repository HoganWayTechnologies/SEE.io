import React, { useState } from 'react'
import { useOnboardingApi } from '../hooks/useOnboardingApi'

const CATEGORY_OPTIONS = [
  'music',
  'nightlife',
  'festivals',
  'arts',
  'outdoors',
  'family',
  'sports',
  'wellness',
  'tech',
  'food & drink'
]

type PreferencesProps = {
  onNext: () => void
}

export default function Preferences({ onNext }: PreferencesProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updatePreferences, saveProgress } = useOnboardingApi()

  const toggle = (category: string) => {
    setSelected(prev => (prev.includes(category) ? prev.filter(item => item !== category) : [...prev, category]))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      await updatePreferences({ categories: selected })
      await saveProgress('preferences')
      onNext()
    } catch (err: any) {
      setError(err?.message || 'Unable to save preferences.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
          <p style={{ textTransform: 'uppercase', color: 'var(--primary-blue)', fontSize: '0.85rem', letterSpacing: '0.08em' }}>
            Step 5 of 6
          </p>
          <h1 style={{ margin: 0 }}>Pick your favorite categories</h1>
          <p style={{ color: 'var(--gray-600)' }}>We use these to surface playlists and collections you’ll like.</p>

          {error && (
            <div style={{ background: '#fee2e2', color: 'var(--error-red)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {CATEGORY_OPTIONS.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => toggle(category)}
                className={`chip ${selected.includes(category) ? 'chip-active' : ''}`}
                style={{ minWidth: '150px' }}
                disabled={loading}
              >
                {category}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
