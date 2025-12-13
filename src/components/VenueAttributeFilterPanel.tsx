import React from 'react'
import VenueAttributePicker from './VenueAttributePicker'
import { VenueAttrKey } from '../constants/venueAttributes'

type Props = {
  value: VenueAttrKey[]
  onChange: (next: VenueAttrKey[]) => void
  mode: 'any' | 'all'
  onModeChange: (mode: 'any' | 'all') => void
  onClear?: () => void
  title?: string
}

export default function VenueAttributeFilterPanel({ value, onChange, mode, onModeChange, onClear, title }: Props) {
  return (
    <div className="card">
      <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p className="card-title" style={{ margin: 0 }}>{title || 'Amenities & Accessibility'}</p>
            <p style={{ color: 'var(--gray-600)', margin: 0 }}>Filter venues by must-have amenities.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0 }}>Match</label>
            <select className="form-input" style={{ minWidth: 120 }} value={mode} onChange={(e) => onModeChange(e.target.value as 'any' | 'all')}>
              <option value="any">Any selected</option>
              <option value="all">All selected</option>
            </select>
            <button type="button" className="btn btn-secondary" onClick={onClear}>Clear</button>
          </div>
        </div>
        <VenueAttributePicker value={value} onChange={onChange} />
      </div>
    </div>
  )
}
