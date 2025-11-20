"use client"
import React from 'react'

export default function DeepLinkButton({ id }: { id: string }) {
  const openDeepLink = () => {
    const appUrl = `socxal://event/${id}`
    const webFallback = `/event/${id}`

    // Attempt to open the native app, then fallback to web after 600ms
    const now = Date.now()
    window.location.href = appUrl

    setTimeout(() => {
      // If still on the same page, navigate to web fallback
      if (Date.now() - now < 1500) {
        window.location.href = webFallback
      }
    }, 600)
  }

  return (
    <div>
      <button
        onClick={openDeepLink}
        className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
      >
        Open in Socxal App
      </button>

      <a href={`https://see.io/event/${id}`} className="ml-4 text-sm text-slate-600">Open web version</a>
    </div>
  )
}
