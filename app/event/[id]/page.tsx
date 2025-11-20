import React from 'react'
import { fetchEventDtoById } from '../../../lib/api'
import DeepLinkButton from '../../../components/DeepLinkButton'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  const evt = await fetchEventDtoById(params.id).catch(() => null)

  return {
    title: evt ? `${evt.title} — SEE.io` : `Event — SEE.io`,
    description: evt ? evt.description : 'Event details on SEE.io',
    openGraph: {
      title: evt ? evt.title : 'Event',
      description: evt ? evt.description : '',
      images: evt && (evt.imageUrl || evt.image) ? [evt.imageUrl || evt.image] : []
    }
  }
}

export default async function EventPage({ params }: Props) {
  const { id } = params
  let evt: any = null

  try {
    evt = await fetchEventDtoById(id)
  } catch (e) {
    // leave evt null and render a basic fallback
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">{evt ? evt.title : `Event ${id}`}</h1>
      <p className="mt-2 text-slate-600">{evt ? evt.shortDescription || evt.description : 'Event detail page — data will be loaded from SEE.API'}</p>

      <div className="mt-6">
        <DeepLinkButton id={id} />
      </div>
    </div>
  )
}
