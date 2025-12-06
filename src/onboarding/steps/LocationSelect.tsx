import React, { useState } from 'react'
import { useOnboardingApi } from '../hooks/useOnboardingApi'

type LocationSelectProps = {
  onNext: () => void
  onSkip?: () => void
}

export default function LocationSelect({ onNext, onSkip }: LocationSelectProps) {
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { saveLocation, saveProgress } = useOnboardingApi()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!city.trim() && !state.trim()) {
      setError('Tell us at least your city or state so we can tailor events.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await saveLocation({ city: city || null, state: state || null, lat: lat || undefined, lon: lon || undefined })
      await saveProgress('location')
      onNext()
    } catch (err: any) {
      setError(err?.message || 'Unable to save location.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    setLoading(true)
    setError(null)
    try {
      await saveProgress('location')
      onSkip?.()
    } catch (err: any) {
      setError(err?.message || 'Unable to continue right now.')
    } finally {
      setLoading(false)
    }
  }

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('Location services are not available in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude)
        setLon(position.coords.longitude)
      },
      () => {
        setError('Unable to read your GPS location. Please enter city/state manually.')
      },
      { enableHighAccuracy: false, timeout: 7000 }
    )
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
          <p style={{ textTransform: 'uppercase', color: 'var(--primary-blue)', fontSize: '0.85rem', letterSpacing: '0.08em' }}>
            Step 4 of 6
          </p>
          <h1 style={{ margin: 0 }}>Where should we start looking?</h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Share your city or state so we can highlight nearby experiences.
          </p>

          {error && (
            <div style={{ background: '#fee2e2', color: 'var(--error-red)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="form-label">City</label>
              <input className="form-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Chicago" disabled={loading} />
            </div>
            <div>
              <label className="form-label">State / Region</label>
              <input className="form-input" value={state} onChange={(e) => setState(e.target.value)} placeholder="IL" disabled={loading} />
            </div>

            <button type="button" className="btn btn-secondary" onClick={handleUseLocation} disabled={loading} style={{ justifySelf: 'flex-start' }}>
              Use my location
            </button>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save & Continue'}
            </button>
            {onSkip && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--gray-500)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Skip for now
              </button>
            )}
         </form>
       </div>
     </div>
   </div>
 )
}
