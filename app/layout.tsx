import './globals.css'
import React from 'react'

export const metadata = {
  title: 'SEE.io — Discover Events',
  description: 'Discover, host and share events powered by Socxal.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen bg-slate-50 text-slate-900">
          {children}
        </main>
      </body>
    </html>
  )
}
