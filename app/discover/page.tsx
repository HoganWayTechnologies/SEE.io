import React from 'react'
import EventCard from '../../components/EventCard'
import { publicSearchEvents } from '../../lib/api'

export default async function DiscoverPage({ searchParams }: { searchParams?: { q?: string; city?: string; category?: string; page?: string } }) {
  const params = {
    q: searchParams?.q,
    city: searchParams?.city,
    category: searchParams?.category,
    page: searchParams?.page
  }

  let results: any[] = []
  try {
    // Call the public search endpoint: /v1/public/events
    const data = await publicSearchEvents(params)
    // The public endpoint returns a paged result with `items` or `events`
    results = Array.isArray(data) ? data : data?.items || data?.events || []
  } catch (e) {
    // on failure, show empty results — dev fallback
    results = []
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">Discover Events</h1>
      <p className="mt-2 text-slate-600">Search, filter, and browse events from SEE.API</p>

      <div className="mt-6">
        {/* Basic results listing. We'll add filter UI and pagination next. */}
        {results.length === 0 ? (
          <div className="text-slate-500">No events found — try changing filters or search query.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((e) => (
              <EventCard key={e.id} id={e.id} title={e.title} date={e.date} location={e.location} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
