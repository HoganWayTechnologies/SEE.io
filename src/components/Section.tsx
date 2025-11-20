import React from 'react'

interface SectionProps {
  children: React.ReactNode
  className?: string
  backgroundColor?: string
  style?: React.CSSProperties
}

export default function Section({
  children,
  className = '',
  backgroundColor,
  style = {}
}: SectionProps) {
  const sectionStyle = backgroundColor
    ? { ...style, backgroundColor }
    : style

  return (
    <section className={`section ${className}`} style={sectionStyle}>
      {children}
    </section>
  )
}