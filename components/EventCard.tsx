import React from 'react'
import Link from 'next/link'

type EventCardProps = {
  id: string
  title: string
  date?: string
  location?: string
}

export default function EventCard({ id, title, date, location }: EventCardProps) {
  return (
    <Link href={`/event/${id}`} className="block p-4 border rounded hover:shadow">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-slate-500">{date} — {location}</p>
    </Link>
  )
}
