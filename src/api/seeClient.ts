export type ProblemDetails = {
  title?: string
  detail?: string
  status?: number
  errors?: Record<string, string[]>
  traceId?: string
}

export type SeeApiErrorDetails = {
  status?: number
  correlationId?: string | null
  details?: any
  fieldErrors?: Record<string, string[]>
  requiresAuth?: boolean
  forbidden?: boolean
}

export class SeeApiError extends Error implements SeeApiErrorDetails {
  status?: number
  correlationId?: string | null
  details?: any
  fieldErrors?: Record<string, string[]>
  requiresAuth?: boolean
  forbidden?: boolean

  constructor(message: string, details: SeeApiErrorDetails = {}) {
    super(message)
    this.name = 'SeeApiError'
    this.status = details.status
    this.correlationId = details.correlationId ?? null
    this.details = details.details
    this.fieldErrors = details.fieldErrors
    this.requiresAuth = details.requiresAuth
    this.forbidden = details.forbidden
  }
}

export const formatSeeApiError = (error: unknown, fallback = 'Something went wrong.') => {
  if (error instanceof SeeApiError) {
    return {
      message: error.message || fallback,
      correlationId: error.correlationId || null,
      fieldErrors: error.fieldErrors || undefined
    }
  }
  if (error instanceof Error) {
    return { message: error.message || fallback, correlationId: null }
  }
  return { message: fallback, correlationId: null }
}

export type PublisherEventStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'approved'
  | 'canceled'
  | 'postponed'
  | 'rescheduled'
  | 'expired'
  | string

export type PublisherEventListParams = {
  businessId?: string | null
  status?: string | null
  search?: string | null
  fromUtc?: string | null
  toUtc?: string | null
  page?: number | null
  pageSize?: number | null
  pageToken?: string | null
}

export type PublisherEventBasics = {
  id?: string
  eventId?: string
  title?: string
  name?: string
  status?: PublisherEventStatus
  startUtc?: string
  endUtc?: string
  city?: string
  state?: string
  venueName?: string
  venue?: { name?: string; address?: string; city?: string; state?: string }
  description?: string | null
  tags?: string[]
  category?: string | null
  timezone?: string | null
  heroImageUrl?: string | null
  imageUrl?: string | null
  publicUrl?: string | null
}

export type CreatePublisherEventRequest = {
  title: string
  description?: string | null
  startUtc: string
  endUtc: string
  timezone: string
  category?: string | null
  tags?: string[]
  admissionType?: string
  externalTicketUrl?: string | null
  imageUrl?: string | null
  ImageUrl?: string | null
  venue: {
    name: string
    address?: string | null
    city?: string | null
    state?: string | null
    lat?: number | null
    lng?: number | null
  }
  isOnline?: boolean
}

export type PostPublishPlacement = {
  id?: string
  name?: string
  status?: string
  reason?: string
  url?: string | null
}

export type PostPublishMetrics = {
  views?: number
  saves?: number
  shares?: number
  ticketClicks?: number
  rsvpCount?: number
}

export type PostPublishRecommendation = {
  action?: 'add_banner' | 'add_tickets' | 'enable_rsvp' | 'share_link' | string
  label?: string
  description?: string
  cta?: string
}

export type PostPublishResponse = {
  isLive?: boolean
  inSearchIndex?: string
  placements?: PostPublishPlacement[]
  firstMetrics?: PostPublishMetrics
  nextBestAction?: PostPublishRecommendation
  publicUrl?: string | null
}

export type PostEventSummaryResponse = {
  eventId?: string
  totals?: Record<string, number>
  highlights?: string[]
  recommendations?: Array<{ label?: string; detail?: string }>
  summary?: string
}

export type BusinessMetricsOverviewParams = {
  businessId: string
  fromUtc: string
  toUtc: string
}

export type BusinessMetricsListParams = BusinessMetricsOverviewParams & {
  sort?: string
  take?: number
}

type SeeClientOptions = {
  baseUrl?: string
  getToken?: () => string | null
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  params?: Record<string, string | number | boolean | null | undefined>
  body?: any
  headers?: Record<string, string>
  auth?: boolean
}

const sanitizeBaseUrl = (value: string | undefined | null, fallback: string) => {
  try {
    const url = new URL(value || fallback)
    if (!/^https?:$/.test(url.protocol)) throw new Error('Invalid protocol')
    return url.toString().replace(/\/$/, '')
  } catch {
    const safe = new URL(fallback)
    return safe.toString().replace(/\/$/, '')
  }
}

const DEFAULT_BASE_URL = sanitizeBaseUrl(
  typeof import.meta !== 'undefined'
    ? ((import.meta as any).env?.VITE_SEE_API_URL || (import.meta as any).env?.NEXT_PUBLIC_SEE_API_URL || '')
    : '',
  'https://socxalapi-prod-e3btc0b3h8bccsgv.eastus2-01.azurewebsites.net/SEEAPI'
)

const buildQuery = (params?: RequestOptions['params']) => {
  if (!params) return ''
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      query.set(key, value.filter(Boolean).join(','))
      return
    }
    query.set(key, String(value))
  })
  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

const pickCorrelationId = (response: Response) => {
  return (
    response.headers.get('x-correlation-id') ||
    response.headers.get('X-Correlation-Id') ||
    response.headers.get('x-correlationid') ||
    null
  )
}

const parseProblemDetails = (payload: any): ProblemDetails | null => {
  if (!payload || typeof payload !== 'object') return null
  const hasDetails = 'title' in payload || 'detail' in payload || 'errors' in payload || 'traceId' in payload
  return hasDetails ? payload : null
}

const resolveErrorMessage = (status: number, payload: any) => {
  if (status === 401) return 'Please sign in again to continue.'
  if (status === 403) return 'You do not have access to this resource.'
  if (typeof payload === 'string' && payload.trim().length > 0) return payload
  if (payload?.title || payload?.detail) return payload.title || payload.detail
  return 'Something went wrong. Please try again.'
}

const parseErrorPayload = async (response: Response) => {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const createSeeClient = (options: SeeClientOptions = {}) => {
  const baseUrl = sanitizeBaseUrl(options.baseUrl || DEFAULT_BASE_URL, DEFAULT_BASE_URL)
  const getToken = options.getToken

  const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const headers: Record<string, string> = {
      ...(options.headers || {})
    }
    const needsAuth = options.auth !== false
    if (needsAuth) {
      const token = getToken?.()
      if (!token) {
        throw new SeeApiError('Please sign in to continue.', { status: 401, requiresAuth: true })
      }
      headers.Authorization = `Bearer ${token}`
    }
    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json'
    }
    const query = buildQuery(options.params)
    const response = await fetch(`${baseUrl}${path}${query}`, {
      method: options.method || 'GET',
      headers,
      body: options.body instanceof FormData ? options.body : options.body !== undefined ? JSON.stringify(options.body) : undefined
    })
    if (response.ok) {
      if (response.status === 204) return null as T
      const text = await response.text()
      if (!text) return null as T
      try {
        return JSON.parse(text) as T
      } catch {
        return text as T
      }
    }
    const correlationId = pickCorrelationId(response)
    const payload = await parseErrorPayload(response)
    const problem = parseProblemDetails(payload)
    const fieldErrors = problem?.errors || undefined
    const message = resolveErrorMessage(response.status, payload)
    throw new SeeApiError(message, {
      status: response.status,
      correlationId,
      details: payload,
      fieldErrors,
      requiresAuth: response.status === 401,
      forbidden: response.status === 403
    })
  }

  return {
    listPublisherEvents: (params?: PublisherEventListParams) =>
      request<any>('/v1/publisher/events', { params }),
    createPublisherEvent: (payload: CreatePublisherEventRequest, params?: { businessId?: string | null }) =>
      request<any>('/v1/publisher/events', { method: 'POST', params, body: payload }),
    updatePublisherEvent: (eventId: string, payload: Partial<CreatePublisherEventRequest>, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}`, { method: 'PUT', params, body: payload }),
    publishPublisherEvent: (eventId: string, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/publish`, { method: 'POST', params }),
    clonePublisherEvent: (eventId: string, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/clone`, { method: 'POST', params }),
    cancelPublisherEvent: (eventId: string, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/cancel`, { method: 'POST', params }),
    postponePublisherEvent: (eventId: string, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/postpone`, { method: 'POST', params }),
    reschedulePublisherEvent: (eventId: string, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/reschedule`, { method: 'POST', params }),
    bulkAdjustPublisherEvents: (payload: any) =>
      request<any>('/v1/publisher/events/bulk/adjust', { method: 'POST', body: payload }),
    fetchPostPublish: (eventId: string) =>
      request<PostPublishResponse>(`/v1/publisher/events/${encodeURIComponent(eventId)}/post-publish`),
    fetchPostEventSummary: (eventId: string) =>
      request<PostEventSummaryResponse>(`/v1/publisher/events/${encodeURIComponent(eventId)}/summary`),
    listEventMedia: (eventId: string, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/media`, { params }),
    uploadEventMedia: (eventId: string, file: File, params?: { businessId?: string | null; variant?: string }) => {
      const form = new FormData()
      form.append('file', file)
      if (params?.variant) form.append('variant', params.variant)
      return request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/media`, {
        method: 'POST',
        params,
        body: form
      })
    },
    updateEventMedia: (eventId: string, mediaId: string, payload: any, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(mediaId)}`, {
        method: 'PUT',
        params,
        body: payload
      }),
    deleteEventMedia: (eventId: string, mediaId: string, params?: { businessId?: string | null }) =>
      request<void>(`/v1/publisher/events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(mediaId)}`, {
        method: 'DELETE',
        params
      }),
    fetchEventPage: (eventId: string, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/page`, { params }),
    updateEventPage: (eventId: string, payload: any, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/page`, { method: 'PUT', params, body: payload }),
    publishEventPage: (eventId: string, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/page/publish`, { method: 'POST', params }),
    previewEventPage: (eventId: string, params?: { businessId?: string | null }) =>
      request<any>(`/v1/publisher/events/${encodeURIComponent(eventId)}/page/preview`, { method: 'POST', params }),
    fetchBusinessMetricsOverview: (params: BusinessMetricsOverviewParams) =>
      request<any>(`/v1/businesses/${encodeURIComponent(params.businessId)}/metrics/overview`, {
        params: { fromUtc: params.fromUtc, toUtc: params.toUtc }
      }),
    fetchBusinessMetricsEvents: (params: BusinessMetricsListParams) =>
      request<any>(`/v1/businesses/${encodeURIComponent(params.businessId)}/metrics/events`, {
        params: { fromUtc: params.fromUtc, toUtc: params.toUtc, sort: params.sort, take: params.take }
      }),
    fetchBusinessMetricsVenues: (params: BusinessMetricsListParams) =>
      request<any>(`/v1/businesses/${encodeURIComponent(params.businessId)}/metrics/venues`, {
        params: { fromUtc: params.fromUtc, toUtc: params.toUtc, sort: params.sort, take: params.take }
      }),
    fetchEventMetrics: (eventId: string, params: { fromUtc: string; toUtc: string }) =>
      request<any>(`/v1/events/${encodeURIComponent(eventId)}/metrics`, { params }),
    fetchVenueMetrics: (venueId: string, params: { fromUtc: string; toUtc: string }) =>
      request<any>(`/v1/venues/${encodeURIComponent(venueId)}/metrics`, { params }),
    fetchShareLink: (eventId: string) =>
      request<any>(`/v1/public/events/${encodeURIComponent(eventId)}/share`, { auth: false }),
    trackShareClick: (eventId: string, payload?: any) =>
      request<any>(`/v1/public/events/${encodeURIComponent(eventId)}/share/click`, { method: 'POST', body: payload, auth: false })
  }
}

export const seeClient = createSeeClient()
