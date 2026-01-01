import React from 'react'
import LineChart from './LineChart'

type ChartConfig = {
  title: string
  data: Array<{ date: string; value: number }>
  valueFormatter?: (value: number) => string
}

export default function MetricsCharts({ charts }: { charts: ChartConfig[] }) {
  return (
    <div className="grid grid-cols-3" style={{ gap: '1rem', marginTop: '1rem' }}>
      {charts.map(chart => (
        <LineChart key={chart.title} title={chart.title} data={chart.data} valueFormatter={chart.valueFormatter} />
      ))}
    </div>
  )
}
