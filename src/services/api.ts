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
  promoted?: boolean
  pageVersionId?: string | null
  pageUpdatedAtUtc?: string | null
}

export interface SearchParams {
  query?: string
  category?: string
  date?: string
  lat?: number
  lon?: number
  city?: string
  state?: string
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

export interface UserPreferences {
  categories?: string[]
  locations?: Array<{ label: string; city: string; radiusKm: number }>
  enableDiscovery?: boolean
  status?: string
}

export interface UserSessionInfo {
  device: string
  location?: string
  lastActive?: string
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
    if (params.city) queryParams.set('city', params.city)
    if (params.state) queryParams.set('state', params.state)
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
export interface TicketType {
  id: string
  name: string
  price?: string | number
  currency?: string
  remaining?: number
  description?: string
  discounts?: EventDiscount[]
}

export interface EventReport {
  id: string
  eventId: string
  status: string
  reason: string
  createdAt: string
}

export interface UserNotification {
  id: string
  title?: string
  message?: string
  reason?: string
  createdAt?: string
  read?: boolean
}

export interface UserTicket {
  id: string
  eventId: string
  eventTitle?: string
  eventDate?: string
  venue?: string
  status?: string
  name?: string
  price?: number | string
  currency?: string
  remaining?: number
  barcode?: TicketBarcode
}

export interface TicketBarcode {
  type?: string
  payload: string
  expiresAt?: string
  nonce?: string
}

export interface EventDiscount {
  id?: string
  code?: string
  amountOff?: number
  percentOff?: number
  maxRedemptions?: number
  redeemedCount?: number
  startsAtUtc?: string | null
  endsAtUtc?: string | null
  status?: string
}

export const getUserIdFromProfile = (profile: any) =>
  profile?.uid || profile?.id || profile?.userId || profile?.localId

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
    const data = await resp.json()
    return data?.data ?? data
  },

  async fetchUserDetails(userId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load user details')
    return resp.json()
  },

  async fetchUserPreferences(userId: string, idToken: string): Promise<UserPreferences> {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/preferences`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load preferences')
    return resp.json()
  },

  async updateUserPreferences(userId: string, idToken: string, payload: UserPreferences) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/preferences`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to update preferences')
    return resp.json()
  },

  async fetchUserSessions(userId: string, idToken: string): Promise<UserSessionInfo[]> {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/sessions`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load sessions')
    return resp.json()
  },

  async fetchUserSaved(userId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/saved`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load saved events')
    return resp.json()
  },

  async saveEvent(userId: string, eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/saved/${encodeURIComponent(eventId)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to save event')
    return resp.json()
  },

  async removeSavedEvent(userId: string, eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/saved/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to remove saved event')
    return resp.json()
  },

  async fetchNotifications(userId: string, idToken: string): Promise<UserNotification[]> {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/notifications`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load notifications')
    return resp.json()
  },

  async markNotificationRead(userId: string, notificationId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/notifications/${encodeURIComponent(notificationId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to update notification')
    return resp.json()
  },

  async fetchUserTickets(userId: string, idToken: string): Promise<UserTicket[]> {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/tickets`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load tickets')
    return resp.json()
  },

  async fetchUserTicketDetail(userId: string, ticketId: string, idToken: string): Promise<UserTicket> {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/tickets/${encodeURIComponent(ticketId)}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load ticket detail')
    return resp.json()
  },

  async transferTicket(userId: string, ticketId: string, idToken: string, payload: { toUserId?: string; toEmail?: string }) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/tickets/${encodeURIComponent(ticketId)}/transfer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) {
      const errBody = await resp.text()
      throw new Error(errBody || 'Ticket transfer failed')
    }
    return resp.json()
  },

  async fetchUserEvents(userId: string, idToken: string, params?: SearchParams) {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.take) query.set('take', params.take.toString())
    if (params?.pageToken) query.set('pageToken', params.pageToken)
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/events?${query}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load user events')
    return resp.json()
  },

  async fetchPublisherEventsAuthorized(idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load publisher events')
    return resp.json()
  },

  async createPublisherEventAuthorized(payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to create event')
    return resp.json()
  },

  async updatePublisherEventAuthorized(eventId: string, payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to update event')
    return resp.json()
  },

  async publishPublisherEvent(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to publish event')
    return resp.json()
  },

  async cancelPublisherEvent(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to cancel event')
    return resp.json()
  },

  async fetchPromotionStatus(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/promotion`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load promotion status')
    return resp.json()
  },

  async startPromotion(eventId: string, payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/promotion`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to start promotion')
    return resp.json()
  },

  async stopPromotion(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/promotion`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to stop promotion')
    return resp.json()
  },

  async fetchDiscounts(eventId: string, idToken: string): Promise<EventDiscount[]> {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/discounts`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load discounts')
    return resp.json()
  },

  async createDiscount(eventId: string, idToken: string, payload: EventDiscount) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/discounts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to create discount')
    return resp.json()
  },

  async updateDiscount(eventId: string, discountId: string, idToken: string, payload: EventDiscount) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/discounts/${encodeURIComponent(discountId)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to update discount')
    return resp.json()
  },

  async deleteDiscount(eventId: string, discountId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/discounts/${encodeURIComponent(discountId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to delete discount')
    return resp.json()
  },

  async fetchModerationStatus(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/moderation`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load moderation status')
    return resp.json()
  },

  async uploadEventImage(eventId: string, file: File, variant: string, idToken: string) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('variant', variant)

    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData
    })
    if (!resp.ok) throw new Error('Failed to upload image')
    return resp.json()
  },

  async fetchPublisherEventStats(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/stats`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load event stats')
    return resp.json()
  },

  // Media + Page Builder
  async fetchEventMedia(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/media`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load media')
    return resp.json()
  },

  async uploadEventMedia(eventId: string, file: File, idToken: string) {
    const formData = new FormData()
    formData.append('file', file)
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData
    })
    if (!resp.ok) throw new Error('Failed to upload media')
    return resp.json()
  },

  async updateEventMedia(eventId: string, mediaId: string, payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(mediaId)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to update media')
    return resp.json()
  },

  async deleteEventMedia(eventId: string, mediaId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(mediaId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to delete media')
    return resp.json()
  },

  async fetchEventPage(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load event page draft/published')
    return resp.json()
  },

  async fetchEventPageCatalog(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/catalog`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load page builder catalog')
    return resp.json()
  },

  async saveEventPage(eventId: string, payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to save page draft')
    return resp.json()
  },

  async publishEventPage(eventId: string, payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/publish`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to publish page')
    return resp.json()
  },

  async requestPagePreviewToken(eventId: string, payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/preview`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    })
    if (!resp.ok) throw new Error('Failed to generate preview token')
    return resp.json()
  },

  async revokePagePreviewToken(eventId: string, token: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/preview/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to revoke preview token')
    return resp.json()
  },

  async fetchPageHistory(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/history`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load page history')
    return resp.json()
  },

  async restorePageVersion(eventId: string, versionId: string, payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/history/${encodeURIComponent(versionId)}/restore`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    })
    if (!resp.ok) throw new Error('Failed to restore page version')
    return resp.json()
  },

  async discardPageDraft(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/draft`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to discard draft')
    return resp.json()
  },

  async fetchPageUsage(eventId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/usage`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load page usage')
    return resp.json()
  },

  async fetchPublicEventPage(eventId: string, previewToken?: string) {
    const url = new URL(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/page`)
    if (previewToken) url.searchParams.set('previewToken', previewToken)
    const resp = await fetch(url.toString())
    if (!resp.ok) throw new Error('Failed to load event page')
    return resp.json()
  },

  async fetchPublisherTasks(idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/tasks`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load tasks')
    return resp.json()
  },

  async fetchPublisherTickets(eventId: string, idToken: string): Promise<UserTicket[]> {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/tickets`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load tickets for event')
    return resp.json()
  },

  async createPublisherTicket(eventId: string, idToken: string, payload: any) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to create ticket')
    return resp.json()
  },

  async updatePublisherTicket(eventId: string, ticketId: string, idToken: string, payload: any) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to update ticket')
    return resp.json()
  },

  async deletePublisherTicket(eventId: string, ticketId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to delete ticket')
    return resp.json()
  },

  async fetchPublisherOrders(eventId: string, idToken: string, params?: { pageSize?: number; pageToken?: string }) {
    const query = new URLSearchParams()
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString())
    if (params?.pageToken) query.set('pageToken', params.pageToken)
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/orders?${query}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load orders')
    return resp.json()
  },

  async fetchPublisherAttendees(eventId: string, idToken: string, params?: { pageSize?: number; pageToken?: string }) {
    const query = new URLSearchParams()
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString())
    if (params?.pageToken) query.set('pageToken', params.pageToken)
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/attendees?${query}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load attendees')
    return resp.json()
  },

  async fetchCategories() {
    const resp = await fetch(`${API_BASE_URL}/v1/categories`)
    if (!resp.ok) throw new Error('Failed to fetch categories')
    return resp.json()
  },

  async fetchEventTickets(eventId: string): Promise<TicketType[]> {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/tickets`)
    if (!resp.ok) throw new Error('Failed to load tickets')
    return resp.json()
  },

  async purchaseTicket(eventId: string, ticketId: string, quantity: number, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}/purchase`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ quantity })
    })
    if (!resp.ok) {
      const errBody = await resp.text()
      throw new Error(errBody || 'Ticket purchase failed')
    }
    return resp.json()
  },

  async createStripeCheckout(eventId: string, ticketId: string, quantity: number, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}/checkout/stripe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ quantity })
    })
    if (!resp.ok) {
      const errBody = await resp.text()
      throw new Error(errBody || 'Stripe checkout failed')
    }
    return resp.json()
  },

  async fetchTicketBarcode(eventId: string, ticketId: string, idToken: string): Promise<TicketBarcode> {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}/barcode`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load ticket code')
    return resp.json()
  },

  async rotateTicketBarcode(eventId: string, ticketId: string, idToken: string): Promise<TicketBarcode> {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}/barcode`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to refresh ticket code')
    return resp.json()
  },

  async submitReport(payload: { eventId: string; reason: string; details?: string; contactEmail?: string }) {
    const resp = await fetch(`${API_BASE_URL}/v1/public/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to submit report')
    return resp.json()
  },

  async fetchAdminReports(idToken: string): Promise<EventReport[]> {
    const resp = await fetch(`${API_BASE_URL}/v1/admin/reports`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to fetch reports')
    return resp.json()
  },

  async getEventShareLink(eventId: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/public/events/${encodeURIComponent(eventId)}/share`)
    if (!resp.ok) throw new Error('Failed to get share link')
    return resp.json()
  },

  async fetchEventReviews(eventId: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/reviews`)
    if (!resp.ok) throw new Error('Failed to load reviews')
    return resp.json()
  },

  async submitEventReview(eventId: string, idToken: string, payload: any) {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to submit review')
    return resp.json()
  },

  async fetchSeeAuthProfile(idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load SEE auth profile')
    return resp.json()
  },

  async linkSocxalAccount(idToken: string, payload: { socxalId: string }) {
    const resp = await fetch(`${API_BASE_URL}/v1/auth/link-socxal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to link Socxal account')
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
    category: pickValue(event.category, event.Category),
    promoted: Boolean(
      pickValue(event.promoted, event.Promoted) ||
      (Array.isArray(event.tags || event.Tags) && (event.tags || event.Tags).includes('promoted'))
    )
  }
}

export const formatEventsForDisplay = (events: any[]): Event[] => {
  return events.map(formatEventForDisplay)
}
