import React from 'react'

type Props = {
  label: string
  value: string
  sublabel?: string
}

export default function KpiCard({ label, value, sublabel }: Props) {
  return (
    <div className="card" style={{ minWidth: 160 }}>
      <div className="card-body">
        <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.95rem' }}>{label}</p>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.8rem', fontWeight: 700 }}>{value}</p>
        {sublabel && <p style={{ margin: '0.25rem 0 0 0', color: 'var(--gray-600)' }}>{sublabel}</p>}
      </div>
    </div>
  )
}
