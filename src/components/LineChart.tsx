import React, { useMemo } from 'react'

type Point = { date: string; value: number }

type Props = {
  title?: string
  data: Point[]
  height?: number
  color?: string
  valueFormatter?: (value: number) => string
}

const defaultFormatter = (v: number) => v.toLocaleString()

export default function LineChart({ title, data, height = 220, color = 'var(--primary-blue)', valueFormatter = defaultFormatter }: Props) {
  const { points, min, max } = useMemo(() => {
    if (!data.length) return { points: [] as { x: number; y: number }[], min: 0, max: 0 }
    const values = data.map(d => d.value)
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range = maxVal - minVal || 1
    const pts = data.map((d, idx) => ({
      x: (idx / Math.max(data.length - 1, 1)) * 100,
      y: ((maxVal - d.value) / range) * 100
    }))
    return { points: pts, min: minVal, max: maxVal }
  }, [data])

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div className="card">
      <div className="card-body">
        {title && <p className="card-title" style={{ marginTop: 0 }}>{title}</p>}
        {data.length === 0 && <p style={{ color: 'var(--gray-600)', margin: 0 }}>No data for this range.</p>}
        {data.length > 0 && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }}>
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={polyline}
              vectorEffect="non-scaling-stroke"
            />
            {points.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r="1.4" fill={color} />
            ))}
          </svg>
        )}
        {data.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray-600)', fontSize: '0.9rem' }}>
            <span>{valueFormatter(min)}</span>
            <span>{valueFormatter(max)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
