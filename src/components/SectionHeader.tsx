import React from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

export default function SectionHeader({
  title,
  subtitle,
  className = ''
}: SectionHeaderProps) {
  return (
    <div className={`section-header ${className}`}>
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </div>
  )
}