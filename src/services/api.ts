// SEE.io API Client
// Handles all API calls to SEE.API and internal endpoints

const API_BASE_URL = (import.meta.env.VITE_SEE_API_URL || 'https://socxalapi-prod-e3btc0b3h8bccsgv.eastus2-01.azurewebsites.net/SEEAPI').replace(/\/$/, '')
const SOCXAL_BASE_URL = (import.meta.env.VITE_SOCXAL_API_URL || 'https://socxalapi-prod-e3btc0b3h8bccsgv.eastus2-01.azurewebsites.net/SocxalAPI').replace(/\/$/, '')

export interface Event {
  id: string
  title: string
  date?: string
  time?: string
  location?: string
  venue?: string
  description?: string
  price?: string
  organizer?: string
  image?: string
  category?: string
}

export interface SearchParams {
  query?: string
  category?: string
  date?: string
  lat?: number
  lon?: number
  radiusKm?: number
  take?: number
  pageToken?: string
  enableDiscovery?: boolean
  forceDiscover?: boolean
  status?: string
}

export interface SearchResponse {
  items: Event[]
  totalCount?: number
  hasMore?: boolean
  nextPageToken?: string | null
}

const normalizeSearchResponse = (data: any): SearchResponse => {
  if (!data) return { items: [] }
  if (Array.isArray(data)) return { items: data }
  const items = data.items || data.events || data.results || []
  const totalCount = data.totalCount ?? data.count
  const hasMore = typeof data.hasMore === 'boolean' ? data.hasMore : Boolean(data.nextPageToken)
  return { items, totalCount, hasMore, nextPageToken: data.nextPageToken || null }
}

// Direct SEE.API calls (when server is not available)
export const seeApi = {
  async searchEvents(params: SearchParams = {}): Promise<SearchResponse> {
    const queryParams = new URLSearchParams()

    if (params.query) queryParams.set('q', params.query)
    if (params.category) queryParams.set('category', params.category)
    if (params.date) {
      queryParams.set('fromUtc', params.date)
      queryParams.set('toUtc', params.date)
    }
    if (params.status) queryParams.set('status', params.status)
    if (params.lat) queryParams.set('lat', params.lat.toString())
    if (params.lon) queryParams.set('lon', params.lon.toString())
    if (params.radiusKm) queryParams.set('radiusKm', params.radiusKm.toString())
    if (params.take) queryParams.set('pageSize', params.take.toString())
    if (params.pageToken) queryParams.set('pageToken', params.pageToken)
    if (typeof params.enableDiscovery === 'boolean') queryParams.set('enableDiscovery', String(params.enableDiscovery))
    if (typeof params.forceDiscover === 'boolean') queryParams.set('forceDiscover', String(params.forceDiscover))

    const response = await fetch(`${API_BASE_URL}/v1/events?${queryParams}`)
    if (!response.ok) throw new Error('Failed to search events (SEE.API)')
    const data = await response.json()
    return normalizeSearchResponse(data)
  },

  async getEvent(id: string): Promise<Event> {
    const response = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(id)}`)
    if (!response.ok) throw new Error('Failed to get event')
    return response.json()
  }
}

// Client-facing helper that always talks to SEE.API directly
export const api = {
  async searchEvents(params: SearchParams = {}): Promise<SearchResponse> {
    return seeApi.searchEvents(params)
  },

  async getPublisherEvents(publisherId: string): Promise<Event[]> {
    // until we have a dedicated publisher listing endpoint, search by organizer id/name
    const results = await seeApi.searchEvents({ query: publisherId, take: 50 })
    return results.items || []
  },

  async fetchProfile(idToken: string) {
    const resp = await fetch(`${SOCXAL_BASE_URL}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load profile')
    return resp.json()
  }
}

// Utility functions
const pickValue = (...candidates: any[]) => {
  for (const value of candidates) {
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const formatDate = (input?: string) => {
  if (!input) return undefined
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return input
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatTime = (input?: string) => {
  if (!input) return undefined
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export const formatEventForDisplay = (event: any): Event => {
  const startIso = pickValue(event.date, event.startDate, event.startUtc, event.StartUtc)
  const timeIso = pickValue(event.time, event.startTime, event.startUtc, event.StartUtc)

  return {
    id: pickValue(event.id, event.eventId, event.Id) || 'unknown',
    title: pickValue(event.title, event.name, event.Title) || 'Untitled Event',
    date: formatDate(startIso) || pickValue(event.date, event.startDate, event.StartUtc, 'Date TBD'),
    time: formatTime(timeIso) || pickValue(event.time, event.startTime),
    location: pickValue(
      event.location,
      event.venue,
      event.VenueName,
      event.VenueAddress,
      event.venueName
    ) || 'Location TBD',
    description: pickValue(event.description, event.Description),
    price: pickValue(event.price, event.ticketPrice, event.Price, 'Free'),
    organizer: pickValue(event.organizer, event.publisher, event.VenueName),
    image: pickValue(event.image, event.imageUrl, event.ImageUrl),
    category: pickValue(event.category, event.Category)
  }
}

export const formatEventsForDisplay = (events: any[]): Event[] => {
  return events.map(formatEventForDisplay)
}
