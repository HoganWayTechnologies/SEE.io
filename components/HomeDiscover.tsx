"use client"
import React, { useEffect, useState } from 'react'
import EventCard from './EventCard'

type EventItem = { id: string; title: string; date?: string; location?: string }

export default function HomeDiscover() {
  const [nearby, setNearby] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPermission('denied')
      return
    }

    // Try to get permission state via Permissions API (best-effort)
    ;(async () => {
      try {
        // @ts-ignore
        const pstate = await navigator.permissions?.query?.({ name: 'geolocation' })
        if (pstate?.state) setPermission(pstate.state)
      } catch (e) {
        // ignore
      }
    })()
  }, [])

  async function requestLocationAndSearch() {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not available in this browser')
      setPermission('denied')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(async (pos) => {
      setPermission('granted')
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude

      try {
        const resp = await fetch(`/api/public-search?lat=${lat}&lon=${lon}&radiusKm=50&take=12`)
        const data = await resp.json()
        if (resp.ok) {
          setNearby(data.items || [])
        } else {
          setError(data.error || 'Search failed')
        }
      } catch (e: any) {
        setError(e?.message || 'Network error')
      } finally {
        setLoading(false)
      }
    }, (err) => {
      setPermission('denied')
      setError(err.message || 'Permission denied')
      setLoading(false)
    }, { enableHighAccuracy: false, maximumAge: 60_000 })
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Events near you</h3>
        <button onClick={requestLocationAndSearch} className="px-3 py-1 bg-sky-600 text-white rounded">{permission==='granted' ? 'Refresh' : 'Allow location'}</button>
      </div>

      {loading && <div className="mt-2 text-slate-500">Loading nearby events…</div>}
      {error && <div className="mt-2 text-red-600">{error}</div>}

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {nearby.length === 0 && !loading ? (
          <div className="text-slate-500">No nearby events yet. Click "Allow location" to see events near you.</div>
        ) : (
          nearby.map((e: any) => (
            <EventCard key={e.id} id={e.id} title={e.title || e.name} date={e.startUtc || e.date} location={(e.venue?.address || e.venueName || e.venue?.name) as any} />
          ))
        )}
      </div>
    </div>
  )
}
