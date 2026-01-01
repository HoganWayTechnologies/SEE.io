import React from 'react'

export default function SummaryReportCard({
  title,
  summary,
  onClone,
  onShare
}: {
  title: string
  summary: {
    totals?: Record<string, number>
    highlights?: string[]
    recommendations?: Array<{ label?: string; detail?: string }>
    summary?: string
  }
  onClone: () => void
  onShare?: () => void
}) {
  const totalsEntries = Object.entries(summary.totals || {})
  return (
    <div className="card">
      <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {summary.summary && <p style={{ color: 'var(--gray-600)' }}>{summary.summary}</p>}
        </div>
        {totalsEntries.length > 0 && (
          <div className="grid grid-cols-3" style={{ gap: '0.75rem' }}>
            {totalsEntries.map(([key, value]) => (
              <div key={key} className="card" style={{ border: '1px solid var(--gray-100)' }}>
                <div className="card-body" style={{ padding: '0.75rem' }}>
                  <div style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{key}</div>
                  <div style={{ fontWeight: 700 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {summary.highlights && summary.highlights.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 0.5rem' }}>What worked</h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--gray-700)' }}>
              {summary.highlights.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.recommendations && summary.recommendations.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 0.5rem' }}>Recommendations</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {summary.recommendations.map((rec, index) => (
                <div key={`${rec.label || 'rec'}-${index}`} className="card" style={{ border: '1px dashed var(--gray-200)' }}>
                  <div className="card-body" style={{ padding: '0.75rem' }}>
                    <strong>{rec.label || 'Next step'}</strong>
                    {rec.detail && <div style={{ color: 'var(--gray-600)' }}>{rec.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onClone}>Clone this event</button>
          {onShare && <button className="btn btn-secondary" onClick={onShare}>Share results</button>}
        </div>
      </div>
    </div>
  )
}
