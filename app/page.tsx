import React from 'react'
import Link from 'next/link'
import EventCard from '../components/EventCard'
import { fetchFeaturedEvents } from '../lib/api'
import AuthForm from '../components/AuthForm'

export default async function HomePage() {
  let featured: any[] = []

  try {
    featured = await fetchFeaturedEvents()
  } catch (e) {
    // fallback to a small mocked list when API isn't available during dev
    featured = [
      { id: 'evt-sample-1', title: 'Sample Music Night', date: '2025-12-01', location: 'Austin, TX' },
      { id: 'evt-sample-2', title: 'Tech Meetup', date: '2025-12-05', location: 'Remote' }
    ]
  }

  return (
    <div className="container mx-auto p-6">
      <header className="py-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Discover events on SEE.io</h1>
            <p className="mt-2 text-slate-600">Find events, buy tickets, and share with friends.</p>
          </div>
          <div>
            <AuthForm />
          </div>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Top events</h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((e) => (
            <EventCard key={e.id} id={e.id} title={e.title} date={e.date} location={e.location} />
          ))}
        </div>

        <HomeDiscover />

        <div className="mt-8">
          <h3 className="text-xl font-semibold">Popular publishers</h3>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Placeholder popular publishers. Replace with real data from SEE.API when an endpoint is available. */}
            <div className="p-4 border rounded">Acme Events</div>
            <div className="p-4 border rounded">City Arts Collective</div>
            <div className="p-4 border rounded">Live Music Co.</div>
          </div>
        </div>

      </section>

      <footer className="mt-12">
        <Link href="/discover" className="text-blue-600">Go to Discover</Link>
      </footer>
    </div>
  )
}
