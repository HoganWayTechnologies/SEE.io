import React from 'react'

type Column<T> = {
  key: string
  header: string
  render: (row: T) => React.ReactNode
}

type Props<T> = {
  title?: string
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
}

export default function MetricsTable<T>({ title, columns, data, emptyMessage }: Props<T>) {
  return (
    <div className="card">
      <div className="card-body">
        {title && <p className="card-title" style={{ marginTop: 0 }}>{title}</p>}
        {data.length === 0 ? (
          <p style={{ color: 'var(--gray-600)', margin: 0 }}>{emptyMessage || 'No data available.'}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--gray-200)' }}>
                  {columns.map(col => (
                    <th key={col.key} style={{ padding: '0.5rem 0.25rem', fontSize: '0.95rem', color: 'var(--gray-700)' }}>{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    {columns.map(col => (
                      <td key={col.key} style={{ padding: '0.65rem 0.25rem', color: 'var(--gray-900)' }}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
