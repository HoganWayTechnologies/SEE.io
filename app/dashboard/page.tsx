import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySessionCookieFromValue } from '../../lib/session'

export default async function DashboardPage() {
  const session = cookies().get('session')?.value || null

  const decoded = await verifySessionCookieFromValue(session)
  if (!decoded) {
    // Not authenticated
    redirect('/')
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
      <p className="mt-2 text-slate-600">Welcome, <strong>{decoded.email || decoded.uid}</strong></p>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Your Organizer Tools</h2>
        <ul className="mt-4 list-disc pl-6 text-slate-700">
          <li>Create and manage events (publisher endpoints)</li>
          <li>View analytics and ticket sales</li>
          <li>Connect Stripe for payouts</li>
        </ul>
      </section>
    </div>
  )
}
