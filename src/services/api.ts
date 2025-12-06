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
  venueName?: string | null
  venueAddress?: string | null
  description?: string
  price?: string
  organizer?: string
  image?: string
  category?: string
  status?: string
  promoted?: boolean
  pageVersionId?: string | null
  pageUpdatedAtUtc?: string | null
  timezone?: string | null
  admissionType?: 'open' | 'free' | 'see_ticketed' | 'external_ticketed' | string
  hasInternalTickets?: boolean
  externalTicketUrl?: string | null
  sourceUrl?: string | null
  tags?: string[]
  hostDisplayName?: string | null
  businessId?: string | null
  businessSlug?: string | null
  businessName?: string | null
}

export interface SearchParams {
  query?: string
  category?: string
  date?: string
  lat?: number
  lon?: number
  venue?: string
  businessId?: string
  host?: string
  city?: string
  state?: string
  radiusKm?: number
  take?: number
  pageToken?: string
  enableDiscovery?: boolean
  forceDiscover?: boolean
  status?: string
  creatorType?: string
  sort?: string
  includePrivate?: boolean
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

export interface UserBusinessMembership {
  businessId: string
  businessName?: string | null
  slug?: string | null
  role: string
  status?: string | null
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
    if (params.creatorType) queryParams.set('creatorType', params.creatorType)
    if (params.sort) queryParams.set('sort', params.sort)
    if (typeof params.includePrivate === 'boolean') queryParams.set('includePrivate', String(params.includePrivate))
    if (params.date) {
      queryParams.set('fromUtc', params.date)
      queryParams.set('toUtc', params.date)
    }
    if (params.status) queryParams.set('status', params.status)
    if (params.lat) queryParams.set('lat', params.lat.toString())
    if (params.lon) queryParams.set('lon', params.lon.toString())
    if (params.venue) queryParams.set('venue', params.venue)
    if (params.host) queryParams.set('host', params.host)
    if (params.businessId) queryParams.set('businessId', params.businessId)
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

export interface EventVenuePayload {
  name: string
  address: string
  city: string
  state: string
  lat?: number | null
  lng?: number | null
}

export interface CreateEventRequest {
  title: string
  description: string
  startUtc: string
  endUtc: string
  timezone: string
  venue: EventVenuePayload
  category?: string | null
  tags?: string[]
  admissionType?: string
  externalTicketUrl?: string | null
}

export type EventInteractionType =
  | 'view'
  | 'click'
  | 'save'
  | 'bookmark'
  | 'share'
  | 'ticket'
  | 'map'

export interface EventInteractionRequest {
  type: EventInteractionType
  source?: string | null
  metadata?: string | null
}

export interface EventInteractionSummary {
  eventId: string
  views: number
  clicks: number
  saves: number
  bookmarks: number
  shares: number
  ticketClicks: number
  mapOpens: number
}

export interface SignupRequestPayload {
  email: string
  password: string
  displayName?: string | null
}

export interface CreateBusinessPayload {
  name: string
  slug?: string | null
  type?: string | null
  description?: string | null
  logoUrl?: string | null
  coverPhotoUrl?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
}

export interface BusinessSignupRequestPayload extends SignupRequestPayload {
  business: CreateBusinessPayload
}

export interface OnboardingStatus {
  step?: string | null
  completedSteps?: string[]
  isComplete?: boolean
  goals?: string[]
  location?: {
    city?: string | null
    state?: string | null
    lat?: number | null
    lon?: number | null
  }
}

export interface OnboardingLocationRequest {
  city?: string | null
  state?: string | null
  lat?: number | null
  lon?: number | null
}

export interface OnboardingGoalsRequest {
  goals: string[]
}

export interface SaveOnboardingProgressRequest {
  steps: Record<string, boolean>
  nextStep?: string | null
  completed?: boolean
}

export interface ConvertUserToBusinessRequest {
  businessName: string
  website?: string | null
  category?: string | null
  city?: string | null
  state?: string | null
  bio?: string | null
}

export interface SigninRequestPayload {
  email: string
  password: string
}

export interface SigninResponsePayload {
  idToken: string
  refreshToken: string
  expiresIn: string
  uid?: string | null
}

export interface EventPlaylistSummary {
  id: string
  title: string
  description?: string | null
  requiresLocation?: boolean
}

export interface EventPlaylistListResponse {
  items: EventPlaylistSummary[]
}

export interface EventPlaylistResponse {
  id: string
  title: string
  description?: string | null
  items: Event[]
}

export interface EventPlaylistUpsertRequest {
  title: string
  description?: string | null
  query?: string | null
  category?: string | null
  creatorType?: string | null
  sort?: string | null
  maxEvents: number
  daysFromOffset: number
  daysToOffset: number
  radiusKm?: number | null
  includePrivate?: boolean
  requiresLocation?: boolean
  defaultLat?: number | null
  defaultLon?: number | null
  city?: string | null
  state?: string | null
  enabled?: boolean
  displayOrder?: number | null
}

export interface EventPlaylistAdminResponse extends EventPlaylistUpsertRequest {
  id: string
  includePrivate: boolean
  requiresLocation: boolean
  enabled: boolean
  displayOrder: number | null
}

export type RsvpStatus = 'going' | 'interested' | 'bookmark' | 'none'
export interface RefundRequestPayload {
  reason?: string | null
  force?: boolean
}

export async function logout(sessionId?: string | null, idToken?: string | null) {
  if (!idToken) return
  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  }
  try {
    await fetch(`${API_BASE_URL}/v1/auth/logout`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sessionId ? { sessionId } : {})
    })
  } catch {
    // best-effort
  }
}

export const getUserIdFromProfile = (profile: any) =>
  profile?.uid || profile?.id || profile?.userId || profile?.localId

const normalizePlaylistSummaries = (payload: any): EventPlaylistSummary[] => {
  const sourceArray = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.Items)
        ? payload.Items
        : []

  return sourceArray
    .map((item: any) => {
      const id = (item?.id ?? item?.Id ?? '').toString().trim()
      if (!id) return null
      const requiresLocation = typeof item?.requiresLocation === 'boolean'
        ? item.requiresLocation
        : typeof item?.RequiresLocation === 'boolean'
          ? item.RequiresLocation
          : undefined

      return {
        id,
        title: (item?.title ?? item?.Title ?? 'Untitled playlist').toString(),
        description: item?.description ?? item?.Description ?? null,
        requiresLocation
      } as EventPlaylistSummary
    })
    .filter(Boolean) as EventPlaylistSummary[]
}

export const api = {
  async searchEvents(params: SearchParams = {}): Promise<SearchResponse> {
    return seeApi.searchEvents(params)
  },

  async getPublisherEvents(publisherId: string): Promise<Event[]> {
    // until we have a dedicated publisher listing endpoint, search by organizer id/name
    const results = await seeApi.searchEvents({ query: publisherId, take: 50 })
    return results.items || []
  },

  async fetchEventPlaylists(): Promise<EventPlaylistListResponse> {
    const resp = await fetch(`${API_BASE_URL}/v1/public/events/playlists`)
    if (!resp.ok) throw new Error('Failed to load event playlists')
    const data = await resp.json()
    return {
      items: normalizePlaylistSummaries(data)
    }
  },

  async fetchEventPlaylist(id: string, options?: { lat?: number; lon?: number; lng?: number }): Promise<EventPlaylistResponse> {
    const query = new URLSearchParams()
    if (typeof options?.lat === 'number') query.set('lat', options.lat.toString())
    if (typeof options?.lng === 'number') {
      query.set('lng', options.lng.toString())
    } else if (typeof options?.lon === 'number') {
      query.set('lon', options.lon.toString())
    }
    const suffix = query.toString() ? `?${query}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/public/events/playlists/${encodeURIComponent(id)}${suffix}`)
    if (!resp.ok) throw new Error('Failed to load event playlist')
    const data = await resp.json()
    const items = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.Items)
        ? data.Items
        : []
    return {
      id: (data?.id ?? data?.Id ?? id).toString(),
      title: data?.title ?? data?.Title ?? '',
      description: data?.description ?? data?.Description ?? null,
      items
    }
  },

  async recordEventInteraction(eventId: string, payload: EventInteractionRequest) {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to record event interaction')
  },

  async fetchProfile(idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load profile')
    const data = await resp.json()
    return data?.data ?? data
  },

  async signupUser(payload: SignupRequestPayload) {
    const resp = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) {
      throw new Error((await resp.text()) || 'Failed to sign up')
    }
    return resp.json()
  },

  async signupBusiness(payload: BusinessSignupRequestPayload) {
    const resp = await fetch(`${API_BASE_URL}/v1/auth/signup/business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) {
      throw new Error((await resp.text()) || 'Failed to sign up business')
    }
    return resp.json()
  },

  async signin(payload: SigninRequestPayload): Promise<SigninResponsePayload> {
    const resp = await fetch(`${API_BASE_URL}/v1/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) {
      throw new Error((await resp.text()) || 'Failed to sign in')
    }
    return resp.json()
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

  async fetchUserBusinessMemberships(userId: string, idToken: string): Promise<UserBusinessMembership[]> {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/business-memberships`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load business memberships')
    const data = await resp.json()
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray((data as any)?.Items)
          ? (data as any).Items
        : []
    return list.map((item: any) => ({
      businessId: item.businessId || item.BusinessId || item.id || null,
      businessName: item.businessName || item.BusinessName || item.name || null,
      slug: item.businessSlug || item.BusinessSlug || item.slug || null,
      role: item.role || item.Role || '',
      status: item.status || item.Status || '',
      city: item.city || item.City || null,
      state: item.state || item.State || null,
      logoUrl: item.logoUrl || item.LogoUrl || null
    }))
  },

  async requestBusinessUpgrade(userId: string, idToken: string, payload: CreateBusinessPayload) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/publisher`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: payload.name,
        slug: payload.slug || null,
        type: payload.type || null,
        description: payload.description || null,
        logoUrl: payload.logoUrl || null,
        coverPhotoUrl: payload.coverPhotoUrl || null,
        website: payload.website || null,
        contactEmail: payload.contactEmail || null,
        contactPhone: payload.contactPhone || null,
        address: payload.address || null,
        city: payload.city || null,
        state: payload.state || null,
        country: payload.country || null
      })
    })
    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(errText || 'Unable to upgrade this account to business')
    }
    return resp.json().catch(() => ({}))
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

  async fetchOnboardingStatus(userId: string, idToken: string): Promise<OnboardingStatus> {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/onboarding`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (resp.status === 404) {
      return { step: 'welcome' }
    }
    if (!resp.ok) throw new Error('Failed to load onboarding status')
    return resp.json()
  },

  async saveOnboardingProgress(userId: string, idToken: string, payload: SaveOnboardingProgressRequest) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/onboarding`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        steps: payload.steps || {},
        nextStep: typeof payload.nextStep === 'string' ? payload.nextStep : null,
        completed: Boolean(payload.completed)
      })
    })
    if (!resp.ok) throw new Error('Failed to update onboarding progress')
    return resp.json()
  },

  async saveOnboardingGoals(userId: string, idToken: string, payload: OnboardingGoalsRequest) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/goals`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to save onboarding goals')
    return resp.json()
  },

  async saveOnboardingLocation(userId: string, idToken: string, payload: OnboardingLocationRequest) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/location`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to save onboarding location')
    return resp.json()
  },

  async convertUserToBusiness(userId: string, idToken: string, payload: ConvertUserToBusinessRequest) {
    const resp = await fetch(`${API_BASE_URL}/v1/users/${encodeURIComponent(userId)}/convert-to-business`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to convert account to business')
    return resp.json()
  },

  async fetchPublisherEventsAuthorized(
    idToken: string,
    params?: {
      businessId?: string | null
      status?: string | null
      search?: string | null
      fromUtc?: string | null
      toUtc?: string | null
      page?: number | null
      pageSize?: number | null
      pageToken?: string | null
    }
  ) {
    const query = new URLSearchParams()
    if (params?.businessId) query.set('businessId', params.businessId)
    if (params?.status) query.set('status', params.status)
    if (params?.search) query.set('search', params.search)
    if (params?.fromUtc) query.set('fromUtc', params.fromUtc)
    if (params?.toUtc) query.set('toUtc', params.toUtc)
    if (typeof params?.page === 'number') query.set('page', params.page.toString())
    if (typeof params?.pageSize === 'number') query.set('pageSize', params.pageSize.toString())
    if (params?.pageToken) query.set('pageToken', params.pageToken)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events${suffix}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load publisher events')
    return resp.json()
  },

  async createPublisherEventAuthorized(payload: CreateEventRequest, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events${suffix}`, {
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

  async updatePublisherEventAuthorized(eventId: string, payload: Partial<CreateEventRequest>, idToken: string) {
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

  async publishPublisherEvent(eventId: string, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/publish${suffix}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to publish event')
    return resp.json()
  },

  async cancelPublisherEvent(eventId: string, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/cancel${suffix}`, {
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

  async fetchPublisherEventInteractions(eventId: string, idToken: string, params?: { businessId?: string }): Promise<EventInteractionSummary> {
    const query = new URLSearchParams()
    if (params?.businessId) query.set('businessId', params.businessId)
    const suffix = query.toString() ? `?${query}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/interactions${suffix}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load event interactions')
    return resp.json()
  },

  // Media + Page Builder
  async fetchEventMedia(eventId: string, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/media${suffix}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load media')
    return resp.json()
  },

  async uploadEventMedia(eventId: string, file: File, idToken: string, businessId?: string | null) {
    const formData = new FormData()
    formData.append('file', file)
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/media${suffix}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData
    })
    if (!resp.ok) throw new Error('Failed to upload media')
    return resp.json()
  },

  async updateEventMedia(eventId: string, mediaId: string, payload: any, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(mediaId)}${suffix}`, {
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

  async deleteEventMedia(eventId: string, mediaId: string, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(mediaId)}${suffix}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to delete media')
    return resp.json()
  },

  async fetchEventPage(eventId: string, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page${suffix}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load event page draft/published')
    return resp.json()
  },

  async fetchEventPageCatalog(eventId: string, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/catalog${suffix}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load page builder catalog')
    return resp.json()
  },

  async saveEventPage(eventId: string, payload: any, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page${suffix}`, {
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

  async publishEventPage(eventId: string, payload: any, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/publish${suffix}`, {
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

  async requestPagePreviewToken(eventId: string, payload: any, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/preview${suffix}`, {
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

  async revokePagePreviewToken(eventId: string, token: string, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/preview/${encodeURIComponent(token)}${suffix}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to revoke preview token')
    return resp.json()
  },

  async fetchPageHistory(eventId: string, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/history${suffix}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load page history')
    return resp.json()
  },

  async restorePageVersion(eventId: string, versionId: string, payload: any, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/history/${encodeURIComponent(versionId)}/restore${suffix}`, {
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

  async discardPageDraft(eventId: string, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/draft${suffix}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to discard draft')
    return resp.json()
  },

  async fetchPageUsage(eventId: string, idToken: string, businessId?: string | null) {
    const suffix = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/events/${encodeURIComponent(eventId)}/page/usage${suffix}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load page usage')
    return resp.json()
  },

  // Business profile builder
  async fetchBusinessMedia(businessId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/media`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load business media')
    return resp.json()
  },

  async uploadBusinessMedia(businessId: string, file: File, idToken: string) {
    const formData = new FormData()
    formData.append('file', file)
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData
    })
    if (!resp.ok) throw new Error('Failed to upload business media')
    return resp.json()
  },

  async deleteBusinessMedia(businessId: string, mediaId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/media/${encodeURIComponent(mediaId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to delete business media')
    return resp.json()
  },

  async fetchBusinessPage(businessId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/page`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load business page')
    return resp.json()
  },

  async fetchBusinessPageCatalog(businessId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/page/catalog`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load business page catalog')
    return resp.json()
  },

  async saveBusinessPage(businessId: string, payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/page`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to save business page')
    return resp.json()
  },

  async publishBusinessPage(businessId: string, payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/page/publish`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to publish business page')
    return resp.json()
  },

  async requestBusinessPagePreviewToken(businessId: string, payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/page/preview`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    })
    if (!resp.ok) throw new Error('Failed to generate business preview token')
    return resp.json()
  },

  async revokeBusinessPagePreviewToken(businessId: string, token: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/page/preview/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to revoke business preview token')
    return resp.json().catch(() => ({}))
  },

  async fetchBusinessPageHistory(businessId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/page/history`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load business page history')
    return resp.json()
  },

  async restoreBusinessPageVersion(businessId: string, versionId: string, payload: any, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/page/history/${encodeURIComponent(versionId)}/restore`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    })
    if (!resp.ok) throw new Error('Failed to restore business page version')
    return resp.json()
  },

  async discardBusinessPageDraft(businessId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/page/draft`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to discard business page draft')
    return resp.json()
  },

  async fetchBusinessPageUsage(businessId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/publisher/businesses/${encodeURIComponent(businessId)}/page/usage`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load business page usage')
    return resp.json()
  },

  async fetchBusinessProfilePage(businessId: string, querySuffix: string = '') {
    const resp = await fetch(`${API_BASE_URL}/v1/businesses/${encodeURIComponent(businessId)}/page${querySuffix}`)
    if (!resp.ok) throw new Error('Failed to load business profile')
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

  // Directory lookups (venues/hosts/businesses) for selectors
  async fetchVenueDirectory(query?: string, take: number = 50) {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (take) params.set('take', String(take))
    const resp = await fetch(`${API_BASE_URL}/v1/venues?${params.toString()}`)
    if (!resp.ok) throw new Error('Failed to fetch venues')
    return resp.json()
  },

  async fetchHostDirectory(query?: string, take: number = 50) {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (take) params.set('take', String(take))
    const resp = await fetch(`${API_BASE_URL}/v1/hosts?${params.toString()}`)
    if (!resp.ok) throw new Error('Failed to fetch hosts')
    return resp.json()
  },

  async fetchBusinessDirectory(query?: string, take: number = 50) {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (take) params.set('take', String(take))
    const resp = await fetch(`${API_BASE_URL}/v1/businesses/directory?${params.toString()}`)
    if (!resp.ok) throw new Error('Failed to fetch businesses')
    return resp.json()
  },

  async fetchEventTickets(eventId: string): Promise<TicketType[]> {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/tickets`)
    if (!resp.ok) throw new Error('Failed to load tickets')
    const data = await resp.json()
    const list = Array.isArray(data?.items)
      ? data.items
      : Array.isArray((data as any)?.Items)
        ? (data as any).Items
        : Array.isArray(data)
          ? data
          : []
    return list.map((t: any) => ({
      id: t.id || t.Id,
      eventId: t.eventId || t.EventId,
      name: t.name || t.Name,
      description: t.description || t.Description,
      price: t.price ?? t.Price ?? 0,
      currency: t.currency || t.Currency || 'USD',
      quantityTotal: t.quantityTotal ?? t.QuantityTotal ?? t.quantity ?? null,
      quantityAvailable: t.quantityAvailable ?? t.QuantityAvailable ?? null,
      salesStartUtc: t.salesStartUtc || t.SalesStartUtc || t.salesStart || null,
      salesEndUtc: t.salesEndUtc || t.SalesEndUtc || t.salesEnd || null
    }))
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

  async fetchEventRsvpStatus(eventId: string, idToken: string): Promise<{ status: RsvpStatus }> {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/rsvp`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load RSVP status')
    return resp.json()
  },

  async updateEventRsvp(eventId: string, status: RsvpStatus, idToken: string): Promise<{ status: RsvpStatus }> {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/rsvp`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    })
    if (!resp.ok) {
      const msg = await resp.text()
      throw new Error(msg || 'Failed to update RSVP')
    }
    return resp.json()
  },

  async fetchEventRsvpSummary(eventId: string): Promise<{ going: number; interested: number; bookmark: number }> {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/rsvp/summary`)
    if (!resp.ok) throw new Error('Failed to load RSVP summary')
    return resp.json()
  },

  async resendTicket(eventId: string, ticketId: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}/resend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to resend ticket')
    return resp.json()
  },

  async refundTicket(eventId: string, ticketId: string, payload: RefundRequestPayload, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {})
    })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(text || 'Failed to refund ticket')
    }
    return resp.json()
  },

  async verifyTicketToken(eventId: string, token: string, checkIn: boolean, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/events/${encodeURIComponent(eventId)}/tickets/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, checkIn })
    })
    if (!resp.ok) throw new Error('Failed to verify ticket')
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

  async fetchAdminEventPlaylists(idToken: string): Promise<EventPlaylistAdminResponse[]> {
    const resp = await fetch(`${API_BASE_URL}/v1/admin/event-playlists`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load admin playlists')
    return resp.json()
  },

  async fetchAdminEventPlaylist(id: string, idToken: string): Promise<EventPlaylistAdminResponse> {
    const resp = await fetch(`${API_BASE_URL}/v1/admin/event-playlists/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to load admin playlist')
    return resp.json()
  },

  async createAdminEventPlaylist(payload: EventPlaylistUpsertRequest, idToken: string): Promise<EventPlaylistAdminResponse> {
    const resp = await fetch(`${API_BASE_URL}/v1/admin/event-playlists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to create admin playlist')
    return resp.json()
  },

  async updateAdminEventPlaylist(id: string, payload: EventPlaylistUpsertRequest, idToken: string): Promise<EventPlaylistAdminResponse> {
    const resp = await fetch(`${API_BASE_URL}/v1/admin/event-playlists/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) throw new Error('Failed to update admin playlist')
    return resp.json()
  },

  async deleteAdminEventPlaylist(id: string, idToken: string) {
    const resp = await fetch(`${API_BASE_URL}/v1/admin/event-playlists/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    })
    if (!resp.ok) throw new Error('Failed to delete admin playlist')
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
  const rawAdmissionType = pickValue(event.admissionType, event.AdmissionType, event.admission_type)
  const admissionType =
    typeof rawAdmissionType === 'string'
      ? (rawAdmissionType.toLowerCase() as Event['admissionType'])
      : undefined
  const rawHasInternalTickets = pickValue(
    event.hasInternalTickets,
    event.HasInternalTickets,
    event.internalTicketing
  )
  const hasInternalTickets =
    typeof rawHasInternalTickets === 'boolean'
      ? rawHasInternalTickets
      : typeof rawHasInternalTickets === 'string'
        ? rawHasInternalTickets.toLowerCase() === 'true'
        : undefined
  const externalTicketUrl = pickValue(
    event.externalTicketUrl,
    event.ExternalTicketUrl,
    event.ticketUrl,
    event.ticketingUrl,
    event.url,
    event.eventUrl
  )
  const sourceUrl = pickValue(
    event.sourceUrl,
    event.SourceUrl,
    event.originalUrl,
    event.OriginalUrl,
    event.discoveryUrl,
    event.link,
    event.Url
  )
  const tagsSource = pickValue(event.tags, event.Tags)
  const tags = Array.isArray(tagsSource)
    ? tagsSource
    : typeof tagsSource === 'string'
      ? tagsSource.split(',').map((tag: string) => tag.trim()).filter(Boolean)
      : undefined
  const businessId = pickValue(
    event.businessId,
    event.BusinessId,
    event.publisherBusinessId,
    event.publisher?.businessId,
    event.business?.id
  )
  const businessSlug = pickValue(
    event.businessSlug,
    event.BusinessSlug,
    event.publisherSlug,
    event.publisher?.slug,
    event.business?.slug
  )
  const businessName = pickValue(
    event.businessName,
    event.BusinessName,
    event.publisher?.name,
    event.business?.name,
    event.hostDisplayName,
    event.organizer
  )

  return {
    id: pickValue(event.id, event.eventId, event.Id) || 'unknown',
    title: pickValue(event.title, event.name, event.Title) || 'Untitled Event',
    date: formatDate(startIso) || pickValue(event.date, event.startDate, event.StartUtc, 'Date TBD'),
    time: formatTime(timeIso) || pickValue(event.time, event.startTime),
    location:
      pickValue(event.location, event.venue, event.VenueName, event.VenueAddress, event.venueName) ||
      'Location TBD',
    venue: pickValue(event.venue, event.venueName, event.VenueName),
    venueName: pickValue(event.venueName, event.VenueName) || null,
    venueAddress: pickValue(event.venueAddress, event.VenueAddress) || null,
    description: pickValue(event.description, event.Description),
    price: pickValue(event.price, event.ticketPrice, event.Price),
    organizer: pickValue(event.organizer, event.publisher, event.VenueName),
    image: pickValue(event.image, event.imageUrl, event.ImageUrl),
    category: pickValue(event.category, event.Category),
    status: pickValue(event.status, event.Status),
    promoted: Boolean(
      pickValue(event.promoted, event.Promoted) ||
      (Array.isArray(event.tags || event.Tags) && (event.tags || event.Tags).includes('promoted'))
    ),
    timezone: pickValue(event.timezone, event.Timezone) || null,
    admissionType,
    hasInternalTickets,
    externalTicketUrl: externalTicketUrl || null,
    sourceUrl: sourceUrl || null,
    tags,
    hostDisplayName: pickValue(event.hostDisplayName, event.HostDisplayName) || null,
    businessId: businessId || null,
    businessSlug: businessSlug || null,
    businessName: businessName || null
  }
}

export const formatEventsForDisplay = (events: any[]): Event[] => {
  return events.map(formatEventForDisplay)
}
