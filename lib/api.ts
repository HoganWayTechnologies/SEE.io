import axios from 'axios'

const API_BASE = (process.env.NEXT_PUBLIC_SEE_API_URL || process.env.SEE_API_URL || 'https://socxalapi-prod-e3btc0b3h8bccsgv.eastus2-01.azurewebsites.net/SEEAPI').replace(/\/$/, '')
const SOCXAL_BASE = (process.env.NEXT_PUBLIC_SOCXAL_API_URL || process.env.SOCXAL_API_URL || 'https://socxalapi-prod-e3btc0b3h8bccsgv.eastus2-01.azurewebsites.net/SocxalAPI').replace(/\/$/, '')

/**
 * Public search endpoint: /v1/public/events
 * Accepts query parameters like q, city, state, lat, lon, radiusKm, take, pageToken
 */
export async function publicSearchEvents(params?: Record<string, any>) {
  const resp = await axios.get(`${API_BASE}/v1/public/events`, { params })
  return resp.data
}

/**
 * Advanced search endpoint: /v1/events
 * Use this for richer searches (pageSize, fromUtc, toUtc, enableDiscovery, etc.)
 */
export async function searchEvents(params?: Record<string, any>) {
  const resp = await axios.get(`${API_BASE}/v1/events`, { params })
  return resp.data
}

/**
 * Fetch a public event by id: /v1/public/events/{id}
 */
export async function fetchPublicEventById(id: string) {
  const resp = await axios.get(`${API_BASE}/v1/public/events/${encodeURIComponent(id)}`)
  return resp.data
}

/**
 * Fetch an event DTO (advanced): /v1/events/{id}
 */
export async function fetchEventDtoById(id: string) {
  const resp = await axios.get(`${API_BASE}/v1/events/${encodeURIComponent(id)}`)
  return resp.data
}

/**
 * Fetch categories: /v1/categories
 */
export async function fetchCategories() {
  const resp = await axios.get(`${API_BASE}/v1/categories`)
  return resp.data
}

export async function fetchAuthMe(idToken: string) {
  const resp = await axios.get(`${SOCXAL_BASE}/admin/auth/me`, {
    headers: { Authorization: `Bearer ${idToken}` }
  })
  return resp.data
}

/**
 * Publisher endpoints (require Bearer token for Publisher role):
 * POST /v1/publisher/events
 * PUT /v1/publisher/events/{id}
 */
export async function createPublisherEvent(payload: any, bearerToken: string) {
  const resp = await axios.post(`${API_BASE}/v1/publisher/events`, payload, {
    headers: { Authorization: `Bearer ${bearerToken}` }
  })
  return resp.data
}

export async function updatePublisherEvent(id: string, payload: any, bearerToken: string) {
  const resp = await axios.put(`${API_BASE}/v1/publisher/events/${encodeURIComponent(id)}`, payload, {
    headers: { Authorization: `Bearer ${bearerToken}` }
  })
  return resp.status === 204 ? null : resp.data
}

/**
 * Convenience: fetch a small featured list using the public endpoint with `take`.
 */
export async function fetchFeaturedEvents(take = 6) {
  const resp = await axios.get(`${API_BASE}/v1/public/events`, { params: { take } })
  // many endpoints return paged result shapes; prefer items/events when present
  const data = resp.data
  if (Array.isArray(data)) return data
  return data?.items || data?.events || []
}
