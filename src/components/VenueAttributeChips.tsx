import React from 'react'
import { VENUE_ATTR_GROUPS, VENUE_ATTR_LABELS, VenueAttrKey, isVenueAttrKey } from '../constants/venueAttributes'

type Props = {
  attributes?: string[] | null
  grouped?: boolean
}

const renderChip = (key: VenueAttrKey) => (
  <span key={key} className="chip chip-small chip-outline">
    {VENUE_ATTR_LABELS[key]}
  </span>
)

export default function VenueAttributeChips({ attributes, grouped = false }: Props) {
  const valid = (attributes || []).filter(isVenueAttrKey)
  if (!valid.length) return null

  if (!grouped) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {valid.map(renderChip)}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {VENUE_ATTR_GROUPS.map(group => {
        const inGroup = group.keys.filter(key => valid.includes(key))
        if (!inGroup.length) return null
        return (
          <div key={group.id}>
            <p style={{ margin: '0 0 0.35rem 0', fontWeight: 600 }}>{group.title}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {inGroup.map(renderChip)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
