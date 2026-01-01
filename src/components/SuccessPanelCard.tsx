import React from 'react'

export default function SuccessPanelCard({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="card">
      <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
        <div>
          <h3 className="card-title" style={{ marginTop: 0 }}>{title}</h3>
          {description && <p style={{ margin: 0, color: 'var(--gray-600)' }}>{description}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
