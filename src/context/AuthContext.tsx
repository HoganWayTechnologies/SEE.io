import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { api, getUserIdFromProfile, UserBusinessMembership, logout as seeLogout } from '../services/api'
import { normalizeStepKey } from '../onboarding/types'
import { loadRefreshTokenSecure, saveRefreshTokenSecure } from '../utils/secureStorage'

const metaEnv = typeof import.meta !== 'undefined' ? ((import.meta as any).env || {}) : {}
const FIREBASE_API_KEY =
  metaEnv.VITE_FIREBASE_API_KEY ||
  metaEnv.NEXT_PUBLIC_FIREBASE_API_KEY ||
  ''

type AuthContextValue = {
  profile: any | null
  idToken: string | null
  socxalToken: string | null
  refreshToken: string | null
  isReady: boolean
  primaryBusinessId: string | null
  businessMemberships: UserBusinessMembership[]
  businessContextReady: boolean
  sessionId: string | null
  signIn: (profile: any, idToken: string, tokens?: { socxalToken?: string; refreshToken?: string | null }) => void
  signOut: (redirectTo?: string | null) => void
  refreshBusinessMemberships: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  idToken: null,
  socxalToken: null,
  refreshToken: null,
  isReady: false,
  primaryBusinessId: null,
  businessMemberships: [],
  businessContextReady: true,
  sessionId: null,
  signIn: () => {},
  signOut: () => {},
  refreshBusinessMemberships: async () => {}
})

const derivePrimaryBusinessId = (profile: any): string | null => {
  if (!profile) return null
  return (
    profile.primaryBusinessId ||
    profile.businessId ||
    profile.business?.id ||
    profile.business?.businessId ||
    profile.publisher?.businessId ||
    profile.businesses?.[0]?.id ||
    null
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [socxalToken, setSocxalToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [primaryBusinessId, setPrimaryBusinessId] = useState<string | null>(null)
  const [businessMemberships, setBusinessMemberships] = useState<UserBusinessMembership[]>([])
  const [businessContextReady, setBusinessContextReady] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const refreshTimeout = useRef<number | null>(null)
  const isRefreshing = useRef(false)
  const unauthorizedSignOutRef = useRef(false)
  const originalFetchRef = useRef<typeof window.fetch | null>(null)

  const persistRefreshToken = useCallback((token: string | null) => {
    if (typeof window === 'undefined') return
    saveRefreshTokenSecure(token).catch(err => {
      console.warn('Failed to persist refresh token', err)
    })
  }, [])

  const persistPrimaryBusiness = useCallback((businessId: string | null) => {
    if (typeof window === 'undefined') return
    if (businessId) {
      window.localStorage.setItem('seePrimaryBusinessId', businessId)
    } else {
      window.localStorage.removeItem('seePrimaryBusinessId')
    }
  }, [])

  const persistBusinessMemberships = useCallback((items: UserBusinessMembership[]) => {
    if (typeof window === 'undefined') return
    if (items && items.length) {
      try {
        window.localStorage.setItem('seeBusinessMemberships', JSON.stringify(items))
      } catch (err) {
        console.warn('Failed to persist business memberships', err)
      }
    } else {
      window.localStorage.removeItem('seeBusinessMemberships')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (typeof window === 'undefined') return
    const load = async () => {
    try {
      const storedProfile = window.localStorage.getItem('seeProfile')
      const storedIdToken = window.sessionStorage.getItem('seeIdToken') || window.localStorage.getItem('seeIdToken')
      const storedSocxalToken = window.sessionStorage.getItem('seeSocxalAccessToken') || window.localStorage.getItem('seeSocxalAccessToken')
      const storedPrimaryBusinessId = window.localStorage.getItem('seePrimaryBusinessId')
      const storedBusinessMemberships = window.localStorage.getItem('seeBusinessMemberships')
      const storedSessionId = window.sessionStorage.getItem('seeSessionId') || window.localStorage.getItem('seeSessionId')
      if (storedProfile) setProfile(JSON.parse(storedProfile))
      if (storedIdToken) setIdToken(storedIdToken)
      if (storedSocxalToken) setSocxalToken(storedSocxalToken)
      if (storedPrimaryBusinessId) setPrimaryBusinessId(storedPrimaryBusinessId)
      if (storedSessionId) setSessionId(storedSessionId)
      if (storedBusinessMemberships) {
        try {
          setBusinessMemberships(JSON.parse(storedBusinessMemberships))
        } catch {
          setBusinessMemberships([])
          }
        }
        const storedRefresh = await loadRefreshTokenSecure()
        if (!cancelled) setRefreshToken(storedRefresh)
      } catch {
        // ignore parse errors
      } finally {
        if (!cancelled) setIsReady(true)
        if (!cancelled) setBusinessContextReady(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
  const hydrateProfile = async () => {
      if (profile || !idToken) return
      try {
        const fetched = await api.fetchProfile(idToken)
        const uid =
          fetched?.uid ||
          fetched?.id ||
          fetched?.userId ||
          fetched?.localId
        const merged = { ...fetched, uid }
        setProfile(merged)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('seeProfile', JSON.stringify(merged))
        }
      } catch {
        // ignore hydrate failures
      }
    }
    hydrateProfile()
  }, [profile, idToken])

  useEffect(() => {
    const derivedPrimary = derivePrimaryBusinessId(profile)
    if (derivedPrimary && derivedPrimary !== primaryBusinessId) {
      setPrimaryBusinessId(derivedPrimary)
    }
    if (!profile && !derivedPrimary) {
      setPrimaryBusinessId(null)
    }
  }, [profile, primaryBusinessId])

  const updateOnboardingLocal = useCallback((status: any) => {
    if (typeof window === 'undefined' || !status) return
    const isComplete = Boolean(status.isComplete ?? status.completed ?? status.Completed)
    if (isComplete) {
      window.localStorage.setItem('see_onboarding_complete', 'true')
      window.localStorage.setItem('see_onboarding_step_key', 'complete')
    } else {
      window.localStorage.removeItem('see_onboarding_complete')
      const stepValue = status.step || status.Step || status.nextStep || status.NextStep
      if (stepValue) {
        window.localStorage.setItem('see_onboarding_step_key', normalizeStepKey(stepValue))
      }
    }
  }, [])

  const hydrateOnboardingOnce = useCallback(async (userProfile: any, token: string) => {
    const userId = getUserIdFromProfile(userProfile)
    if (!userId || !token) return
    try {
      const status = await api.fetchOnboardingStatus(userId, token)
      updateOnboardingLocal(status)
    } catch (err) {
      console.debug('Unable to hydrate onboarding status at login', err)
    }
  }, [updateOnboardingLocal])

  const refreshBusinessMemberships = useCallback(async () => {
    if (!profile || !idToken) {
      setBusinessMemberships([])
      persistBusinessMemberships([])
      setBusinessContextReady(true)
      return
    }
    const userId = getUserIdFromProfile(profile)
    if (!userId) {
      setBusinessMemberships([])
      setBusinessContextReady(true)
      return
    }
    setBusinessContextReady(false)
    try {
      const memberships = await api.fetchUserBusinessMemberships(userId, idToken)
      const normalized = Array.isArray(memberships)
        ? memberships.map(member => ({
          ...member,
          businessId: member.businessId || (member as any).BusinessId || null,
          businessName: member.businessName || (member as any).BusinessName || null
        }))
        : []
      setBusinessMemberships(normalized)
      persistBusinessMemberships(normalized)
    } catch (err) {
      console.warn('Failed to load business memberships', err)
      setBusinessMemberships([])
      persistBusinessMemberships([])
    } finally {
      setBusinessContextReady(true)
    }
  }, [profile, idToken, persistBusinessMemberships])

  useEffect(() => {
    refreshBusinessMemberships()
  }, [refreshBusinessMemberships])

  useEffect(() => {
    if (!primaryBusinessId && businessMemberships.length) {
      const fallback = businessMemberships[0]?.businessId || null
      if (fallback) {
        setPrimaryBusinessId(fallback)
      }
    }
    if (!businessMemberships.length && !profile) {
      setPrimaryBusinessId(null)
    }
  }, [businessMemberships, primaryBusinessId, profile])

  useEffect(() => {
    persistPrimaryBusiness(primaryBusinessId)
  }, [primaryBusinessId, persistPrimaryBusiness])

  const signIn = (nextProfile: any, nextIdToken: string, tokens?: { socxalToken?: string; refreshToken?: string | null }) => {
    setProfile(nextProfile)
    setIdToken(nextIdToken)
    setSocxalToken(tokens?.socxalToken || null)
    setRefreshToken(tokens?.refreshToken || null)
    setIsReady(true)
    setBusinessContextReady(false)
    setBusinessMemberships([])
    persistBusinessMemberships([])
    const derivedPrimary = derivePrimaryBusinessId(nextProfile)
    setPrimaryBusinessId(derivedPrimary)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('seeProfile', JSON.stringify(nextProfile || null))
      window.localStorage.setItem('seeIdToken', nextIdToken || '')
      window.sessionStorage.setItem('seeIdToken', nextIdToken || '')
      if (tokens?.socxalToken) {
        window.localStorage.setItem('seeSocxalAccessToken', tokens.socxalToken)
        window.sessionStorage.setItem('seeSocxalAccessToken', tokens.socxalToken)
      } else {
        window.localStorage.removeItem('seeSocxalAccessToken')
        window.sessionStorage.removeItem('seeSocxalAccessToken')
      }
      if (derivedPrimary) {
        window.localStorage.setItem('seePrimaryBusinessId', derivedPrimary)
      } else {
        window.localStorage.removeItem('seePrimaryBusinessId')
      }
      window.localStorage.removeItem('seeBusinessMemberships')
    }
    persistRefreshToken(tokens?.refreshToken || null)
    hydrateOnboardingOnce(nextProfile, nextIdToken)
    unauthorizedSignOutRef.current = false
  }

  const clearOnboardingState = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('see_onboarding_complete')
      window.localStorage.removeItem('see_onboarding_step_key')
    }
  }

  const signOut = useCallback((redirectTo: string | null = '/') => {
    if (idToken) {
      seeLogout(sessionId, idToken)
    }
    setProfile(null)
    setIdToken(null)
    setSocxalToken(null)
    setRefreshToken(null)
    setPrimaryBusinessId(null)
    setBusinessMemberships([])
    setBusinessContextReady(true)
    setSessionId(null)
    if (refreshTimeout.current) {
      window.clearTimeout(refreshTimeout.current)
      refreshTimeout.current = null
    }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('seeProfile')
      window.localStorage.removeItem('seeIdToken')
      window.localStorage.removeItem('seeSocxalAccessToken')
      window.sessionStorage.removeItem('seeIdToken')
      window.sessionStorage.removeItem('seeSocxalAccessToken')
      window.localStorage.removeItem('seePrimaryBusinessId')
      window.localStorage.removeItem('seeBusinessMemberships')
      window.localStorage.removeItem('seeSessionId')
    }
    clearOnboardingState()
    persistRefreshToken(null)
    persistBusinessMemberships([])
    setIsReady(true)
    unauthorizedSignOutRef.current = false
    if (typeof window !== 'undefined' && redirectTo) {
      window.setTimeout(() => {
        window.location.assign(redirectTo)
      }, 0)
    }
  }, [persistRefreshToken, persistBusinessMemberships])

  const decodeIdTokenExpiration = (token: string | null) => {
    if (!token || typeof window === 'undefined') return null
    try {
      const [, payload] = token.split('.')
      if (!payload) return null
      const decoded = JSON.parse(window.atob(payload))
      if (!decoded?.exp) return null
      return decoded.exp * 1000
    } catch {
      return null
    }
  }

  const refreshSession = useCallback(async () => {
    if (!refreshToken || isRefreshing.current || !FIREBASE_API_KEY) return
    isRefreshing.current = true
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
      const resp = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      })
      if (!resp.ok) throw new Error('Failed to refresh Firebase token')
      const data = await resp.json()
      const nextIdToken = data.id_token
      const nextRefreshToken = data.refresh_token || refreshToken
      if (!nextIdToken) throw new Error('Missing refreshed ID token')
      setIdToken(nextIdToken)
      if (nextRefreshToken !== refreshToken) {
        setRefreshToken(nextRefreshToken)
        persistRefreshToken(nextRefreshToken)
      }
    } catch (err) {
      console.warn('Token refresh failed', err)
      signOut()
    } finally {
      isRefreshing.current = false
    }
  }, [refreshToken, persistRefreshToken, signOut])

  useEffect(() => {
    if (refreshTimeout.current) {
      window.clearTimeout(refreshTimeout.current)
      refreshTimeout.current = null
    }
    if (!idToken || !refreshToken) return
    const expiresAt = decodeIdTokenExpiration(idToken)
    if (!expiresAt) return
    const now = Date.now()
    const delay = Math.max(expiresAt - now - 60 * 1000, 30 * 1000)
    refreshTimeout.current = window.setTimeout(() => {
      refreshSession()
    }, delay)
    return () => {
      if (refreshTimeout.current) {
        window.clearTimeout(refreshTimeout.current)
        refreshTimeout.current = null
      }
    }
  }, [idToken, refreshToken, refreshSession])

  const handleUnauthorized = useCallback(() => {
    // If there is no active auth session, ignore 401s (public calls can return 401)
    if (!idToken) return
    if (unauthorizedSignOutRef.current) return
    unauthorizedSignOutRef.current = true
    console.warn('SEE.io session expired or became unauthorized. Signing out.')
    const next = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname + window.location.search) : ''
    signOut(`/auth?next=${next}`)
  }, [idToken, signOut])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!originalFetchRef.current) {
      originalFetchRef.current = window.fetch.bind(window)
    }
    const baseFetch = originalFetchRef.current
    const getCsrfToken = () => {
      if (typeof document === 'undefined') return null
      const match = document.cookie.match(/(?:^|; )see_csrf=([^;]*)/)
      if (match && match[1]) return decodeURIComponent(match[1])
      const alt = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)
      if (alt && alt[1]) return decodeURIComponent(alt[1])
      return null
    }
    const patchedFetch: typeof window.fetch = async (...args) => {
      let request: Request
      let url = ''
      try {
        request = new Request(args[0] as RequestInfo, args[1] as RequestInit)
        url = request.url
      } catch {
        request = undefined as any
        if (typeof args[0] === 'string') url = args[0]
      }
      const csrfToken = getCsrfToken()
      if (request && csrfToken) {
        const method = (request.method || 'GET').toUpperCase()
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
          const headers = new Headers(request.headers)
          if (!headers.has('X-CSRF-Token')) headers.set('X-CSRF-Token', csrfToken)
          request = new Request(request, { headers })
        }
      }
      const response = request ? await baseFetch(request) : await baseFetch(...(args as any))
      const sessionHeader = response.headers.get('x-session-id') || response.headers.get('X-Session-Id')
      if (sessionHeader) {
        setSessionId(sessionHeader)
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('seeSessionId', sessionHeader)
        }
      }
      if (response.status === 401) {
        const hasAuthHeader =
          request &&
          (request.headers.get('Authorization') || request.headers.get('authorization'))
        if (idToken && hasAuthHeader) {
          handleUnauthorized()
        }
      } else if (response.status === 403) {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/403')) {
          window.sessionStorage.setItem('see_forbidden_path', window.location.pathname + window.location.search)
          window.location.assign('/403')
        }
      }
      return response
    }
    window.fetch = patchedFetch
    return () => {
      window.fetch = baseFetch
    }
  }, [handleUnauthorized])

  useEffect(() => {
    unauthorizedSignOutRef.current = false
  }, [idToken])

  return (
    <AuthContext.Provider
      value={{
        profile,
        idToken,
        socxalToken,
        refreshToken,
        isReady,
        primaryBusinessId,
        businessMemberships,
        businessContextReady,
        sessionId,
        signIn,
        signOut,
        refreshBusinessMemberships
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
