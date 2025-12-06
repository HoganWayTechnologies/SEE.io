import React, { useState } from 'react'
import { useOnboardingApi } from '../hooks/useOnboardingApi'

type BusinessDetailsProps = {
  onNext: () => void
}

export default function BusinessDetails({ onNext }: BusinessDetailsProps) {
  const [form, setForm] = useState({
    businessName: '',
    website: '',
    category: '',
    city: '',
    state: '',
    bio: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { convertToBusiness, saveProgress } = useOnboardingApi()

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.businessName.trim()) {
      setError('Business or organization name is required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await convertToBusiness({
        businessName: form.businessName,
        website: form.website || null,
        category: form.category || null,
        city: form.city || null,
        state: form.state || null,
        bio: form.bio || null
      })
      await saveProgress('business_details')
      onNext()
    } catch (err: any) {
      setError(err?.message || 'Unable to save business info.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-body">
          <p style={{ textTransform: 'uppercase', color: 'var(--primary-blue)', fontSize: '0.85rem', letterSpacing: '0.08em' }}>
            Step 4
          </p>
          <h1 style={{ margin: '0.25rem 0 1rem 0' }}>Business details</h1>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            These details appear on your public SEE profile and event pages.
          </p>

          {error && (
            <div style={{ background: '#fee2e2', color: 'var(--error-red)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="form-label">Business or organization name</label>
              <input className="form-input" value={form.businessName} onChange={handleChange('businessName')} placeholder="City Nightlife Group" required />
            </div>
            <div>
              <label className="form-label">Website or social link</label>
              <input className="form-input" value={form.website} onChange={handleChange('website')} placeholder="https://" />
            </div>
            <div>
              <label className="form-label">Category</label>
              <input className="form-input" value={form.category} onChange={handleChange('category')} placeholder="Venue, Bar, Arts Collective…" />
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label className="form-label">City</label>
                <input className="form-input" value={form.city} onChange={handleChange('city')} placeholder="Austin" />
              </div>
              <div style={{ width: '120px' }}>
                <label className="form-label">State</label>
                <input className="form-input" value={form.state} onChange={handleChange('state')} placeholder="TX" />
              </div>
            </div>
            <div>
              <label className="form-label">Bio / tagline</label>
              <textarea className="form-input" rows={4} value={form.bio} onChange={handleChange('bio')} placeholder="Tell people what you host…" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
