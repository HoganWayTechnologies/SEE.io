import React from 'react'
import { VENUE_ATTR_GROUPS, VENUE_ATTR_LABELS, VenueAttrKey } from '../constants/venueAttributes'

type Props = {
  value: VenueAttrKey[]
  onChange: (next: VenueAttrKey[]) => void
  disabled?: boolean
}

export default function VenueAttributePicker({ value, onChange, disabled }: Props) {
  const toggle = (key: VenueAttrKey) => {
    if (disabled) return
    const exists = value.includes(key)
    const next = exists ? value.filter(k => k !== key) : [...value, key]
    onChange(next)
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {VENUE_ATTR_GROUPS.map(group => (
        <div key={group.id}>
          <p style={{ margin: '0 0 0.35rem 0', fontWeight: 600 }}>{group.title}</p>
          <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {group.keys.map(key => (
              <label key={key} className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={value.includes(key)}
                  onChange={() => toggle(key)}
                  disabled={disabled}
                  style={{ width: '1.05rem', height: '1.05rem' }}
                />
                <span style={{ fontWeight: 500 }}>{VENUE_ATTR_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
