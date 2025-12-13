import React, { useEffect, useState } from 'react'
import { DateRangePreset, DateRangeValue } from '../utils/dateRange'

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom' }
]

type Props = {
  value: DateRangeValue
  onChange: (next: DateRangeValue) => void
}

export default function DateRangePicker({ value, onChange }: Props) {
  const [localFrom, setLocalFrom] = useState(value.from || '')
  const [localTo, setLocalTo] = useState(value.to || '')

  useEffect(() => {
    setLocalFrom(value.from || '')
    setLocalTo(value.to || '')
  }, [value.from, value.to, value.preset])

  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      onChange({ preset, from: localFrom, to: localTo })
    } else {
      onChange({ preset })
    }
  }

  const handleCustomChange = (from?: string, to?: string) => {
    onChange({ preset: 'custom', from, to })
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label" style={{ marginBottom: '0.35rem' }}>Date range</label>
          <select
            className="form-input"
            value={value.preset}
            onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
          >
            {PRESETS.map(preset => (
              <option key={preset.value} value={preset.value}>{preset.label}</option>
            ))}
          </select>
        </div>
        {value.preset === 'custom' && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '0.35rem' }}>From</label>
              <input
                type="date"
                className="form-input"
                value={localFrom}
                onChange={(e) => {
                  setLocalFrom(e.target.value)
                  handleCustomChange(e.target.value || undefined, localTo || undefined)
                }}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '0.35rem' }}>To</label>
              <input
                type="date"
                className="form-input"
                value={localTo}
                onChange={(e) => {
                  setLocalTo(e.target.value)
                  handleCustomChange(localFrom || undefined, e.target.value || undefined)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
