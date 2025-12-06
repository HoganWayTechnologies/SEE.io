import axios from 'axios'

const getRuntimeEnv = () => {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SOCXAL_API_URL) {
    return process.env.NEXT_PUBLIC_SOCXAL_API_URL
  }
  const importMetaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined
  if (importMetaEnv?.VITE_SOCXAL_API_URL) {
    return importMetaEnv.VITE_SOCXAL_API_URL
  }
  return undefined
}

const SOCXAL_BASE = (getRuntimeEnv() || 'https://socxalapi-prod-e3btc0b3h8bccsgv.eastus2-01.azurewebsites.net/SocxalAPI').replace(/\/$/, '')

type SocxalEnvelope = {
  data?: any
  [key: string]: any
}

export type SocxalAuthResult = {
  accessToken?: string
  refreshToken?: string
  user?: any
  raw: any
}

const normalizeAuthResponse = (responseData: SocxalEnvelope): SocxalAuthResult => {
  const payload = responseData?.data ?? responseData
  const accessToken = payload?.access_token || payload?.accessToken || payload?.idToken
  const refreshToken = payload?.refresh_token || payload?.refreshToken
  const user = payload?.user ?? {
    localId: payload?.localId,
    email: payload?.email,
    firstLogin: payload?.firstLogin
  }
  return { accessToken, refreshToken, user, raw: payload }
}

export async function socxalLogin(email: string, password: string) {
  if (!SOCXAL_BASE) throw new Error('SOCXAL API base URL not configured (NEXT_PUBLIC_SOCXAL_API_URL)')
  const resp = await axios.post(`${SOCXAL_BASE}/api/Auth/signIn`, { email, password })
  return normalizeAuthResponse(resp.data)
}

export async function socxalRegister(email: string, password: string, displayName?: string) {
  if (!SOCXAL_BASE) throw new Error('SOCXAL API base URL not configured (NEXT_PUBLIC_SOCXAL_API_URL)')
  const resp = await axios.post(`${SOCXAL_BASE}/api/Auth/register`, { email, password, displayName })
  return normalizeAuthResponse(resp.data)
}

export async function refreshSocxalToken(refreshToken: string) {
  if (!SOCXAL_BASE) throw new Error('SOCXAL API base URL not configured (NEXT_PUBLIC_SOCXAL_API_URL)')
  const resp = await axios.post(`${SOCXAL_BASE}/api/Auth/refresh`, { refreshToken })
  return normalizeAuthResponse(resp.data)
}

export async function exchangeToFirebase(socxalAccessToken: string) {
  if (!SOCXAL_BASE) throw new Error('SOCXAL API base URL not configured (NEXT_PUBLIC_SOCXAL_API_URL)')
  const resp = await axios.post(`${SOCXAL_BASE}/api/Auth/exchange-to-firebase`, {}, {
    headers: { Authorization: `Bearer ${socxalAccessToken}` }
  })
  return resp.data // expected { firebaseToken, uid, expires_in }
}

export async function resetSocxalPassword(email: string) {
  if (!SOCXAL_BASE) throw new Error('SOCXAL API base URL not configured (NEXT_PUBLIC_SOCXAL_API_URL)')
  const resp = await axios.post(`${SOCXAL_BASE}/api/Auth/reset-password`, { email })
  return resp.data
}

export async function updateSocxalProfile(token: string, payload: { displayName?: string; phoneNumber?: string }) {
  if (!SOCXAL_BASE) throw new Error('SOCXAL API base URL not configured (NEXT_PUBLIC_SOCXAL_API_URL)')
  const resp = await axios.post(`${SOCXAL_BASE}/api/Auth/update-profile`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return resp.data
}

export async function logoutAllSocxalSessions(token: string) {
  if (!SOCXAL_BASE) throw new Error('SOCXAL API base URL not configured (NEXT_PUBLIC_SOCXAL_API_URL)')
  const resp = await axios.post(`${SOCXAL_BASE}/api/Auth/logout-all`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return resp.data
}
