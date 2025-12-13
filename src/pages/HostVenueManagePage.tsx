import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import SiteNav from '../components/SiteNav'
import { api, Venue } from '../services/api'
import { useAuth } from '../context/AuthContext'
import VenueAttributePicker from '../components/VenueAttributePicker'
import { VenueAttrKey, isVenueAttrKey } from '../constants/venueAttributes'

type VenueForm = {
  phone: string
  websiteUrl: string
  instagramUrl: string
  imageUrl: string
  tags: string
  categories: string
  description: string
  attributes: VenueAttrKey[]
}

const defaultForm: VenueForm = {
  phone: '',
  websiteUrl: '',
  instagramUrl: '',
  imageUrl: '',
  tags: '',
  categories: '',
  description: '',
  attributes: []
}

export default function HostVenueManagePage() {
  const { id } = useParams()
  const auth = useAuth()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [form, setForm] = useState<VenueForm>(defaultForm)
  const [status, setStatus] = useState<string | null>('Loading venue…')
  const [saving, setSaving] = useState(false)
  const [originalAttributes, setOriginalAttributes] = useState<VenueAttrKey[]>([])

  const loadVenue = async () => {
    if (!id) return
    setStatus('Loading venue…')
    try {
      const data = await api.fetchVenue(id)
      setVenue(data)
      setForm({
        phone: data.phone || '',
        websiteUrl: data.websiteUrl || '',
        instagramUrl: data.instagramUrl || '',
        imageUrl: data.imageUrl || '',
        tags: (data.tags || []).join(', '),
        categories: (data.categories || []).join(', '),
        description: data.description || '',
        attributes: (data.attributes || []).filter(isVenueAttrKey)
      })
      setOriginalAttributes((data.attributes || []).filter(isVenueAttrKey))
      setStatus(null)
    } catch (err: any) {
      setStatus(err?.message || 'Unable to load venue.')
    }
  }

  useEffect(() => {
    loadVenue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const updateField = (key: keyof VenueForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }
  const updateAttributes = (attrs: VenueAttrKey[]) => {
    setForm(prev => ({ ...prev, attributes: attrs }))
  }

  const handleSave = async () => {
    if (!id || !auth.idToken) {
      setStatus('Sign in with a host account to save changes.')
      return
    }
    const toList = (value: string) => value.split(',').map(v => v.trim()).filter(Boolean)
    const payload = {
      phone: form.phone.trim() || null,
      websiteUrl: form.websiteUrl.trim() || null,
      instagramUrl: form.instagramUrl.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      description: form.description.trim() || null,
      tags: toList(form.tags),
      categories: toList(form.categories),
      attributes: form.attributes
    }
    try {
      setSaving(true)
      setStatus('Saving changes…')
      const updated = await api.updateVenue(id, payload, auth.idToken)
      setVenue(updated)
      setOriginalAttributes((updated.attributes || []).filter(isVenueAttrKey))
      setStatus('Saved.')
    } catch (err: any) {
      const message = err?.message || 'Unable to save venue.'
      if (message.toLowerCase().includes('permission')) {
        setStatus('Only the claimed venue owner can edit this venue.')
      } else {
        setStatus(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const hasUnsavedAttributes =
    form.attributes.length !== originalAttributes.length ||
    form.attributes.some(key => !originalAttributes.includes(key))

  return (
    <div>
      <SiteNav activePath="/host/venues" />
      <div className="container" style={{ padding: '2.5rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p className="badge badge-active" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>Host</p>
            <h1 style={{ margin: 0 }}>Manage venue</h1>
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>{venue?.name || 'Venue'} · {venue?.city} {venue?.state}</p>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body">
            {status && <p style={{ color: 'var(--gray-600)' }}>{status}</p>}
            {hasUnsavedAttributes && (
              <div className="card" style={{ background: 'var(--light-blue)', marginBottom: '1rem' }}>
                <div className="card-body" style={{ padding: '0.75rem 1rem' }}>
                  <p style={{ margin: 0, color: 'var(--gray-700)' }}>You have unsaved amenity changes.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-input" value={form.websiteUrl} onChange={(e) => updateField('websiteUrl', e.target.value)} placeholder="https://yourvenue.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Instagram</label>
                <input className="form-input" value={form.instagramUrl} onChange={(e) => updateField('instagramUrl', e.target.value)} placeholder="https://instagram.com/yourvenue" />
              </div>
              <div className="form-group">
                <label className="form-label">Hero image</label>
                <input className="form-input" value={form.imageUrl} onChange={(e) => updateField('imageUrl', e.target.value)} placeholder="https://..." />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tags (comma separated)</label>
              <input className="form-input" value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="rooftop, lounge, outdoors" />
            </div>
            <div className="form-group">
              <label className="form-label">Categories (comma separated)</label>
              <input className="form-input" value={form.categories} onChange={(e) => updateField('categories', e.target.value)} placeholder="music, comedy, film" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={4} value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Tell hosts and guests what makes this space special." />
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <p className="card-title" style={{ margin: 0 }}>Amenities & Accessibility</p>
                  <p style={{ margin: 0, color: 'var(--gray-600)' }}>Surface accessibility, parking, and comfort for guests.</p>
                </div>
                <VenueAttributePicker value={form.attributes} onChange={updateAttributes} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
