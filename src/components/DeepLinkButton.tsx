import React from 'react'

interface DeepLinkButtonProps {
  eventId: string
  className?: string
  variant?: 'primary' | 'secondary'
}

export default function DeepLinkButton({
  eventId,
  className = '',
  variant = 'secondary'
}: DeepLinkButtonProps) {
  const openDeep = () => {
    const url = `socxal://event/${eventId}`
    window.location.href = url
    setTimeout(() => {
      // fallback to web
      window.location.href = `/event/${eventId}`
    }, 600)
  }

  return (
    <button
      onClick={openDeep}
      className={`btn btn-${variant} ${className}`}
      style={{ width: '100%' }}
    >
      Open in Socxal
    </button>
  )
}
