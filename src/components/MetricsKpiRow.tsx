import React from 'react'
import KpiCard from './KpiCard'

type KpiItem = {
  label: string
  value: string | number
}

export default function MetricsKpiRow({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginTop: '0.75rem' }}>
      {items.map(item => (
        <KpiCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  )
}
