import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'

type AuthContextValue = {
  profile: any | null
  idToken: string | null
  socxalToken: string | null
  isReady: boolean
  signIn: (profile: any, idToken: string, socxalToken?: string) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  idToken: null,
  socxalToken: null,
  isReady: false,
  signIn: () => {},
  signOut: () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [socxalToken, setSocxalToken] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const storedProfile = window.localStorage.getItem('seeProfile')
      const storedIdToken = window.localStorage.getItem('seeIdToken')
      const storedSocxalToken = window.localStorage.getItem('seeSocxalAccessToken')
      if (storedProfile) setProfile(JSON.parse(storedProfile))
      if (storedIdToken) setIdToken(storedIdToken)
      if (storedSocxalToken) setSocxalToken(storedSocxalToken)
    } catch {
      // ignore parse errors
    } finally {
      setIsReady(true)
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

  const signIn = (nextProfile: any, nextIdToken: string, nextSocxalToken?: string) => {
    setProfile(nextProfile)
    setIdToken(nextIdToken)
    setSocxalToken(nextSocxalToken || null)
    setIsReady(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('seeProfile', JSON.stringify(nextProfile || null))
      window.localStorage.setItem('seeIdToken', nextIdToken || '')
      if (nextSocxalToken) {
        window.localStorage.setItem('seeSocxalAccessToken', nextSocxalToken)
      } else {
        window.localStorage.removeItem('seeSocxalAccessToken')
      }
    }
  }

  const signOut = () => {
    setProfile(null)
    setIdToken(null)
    setSocxalToken(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('seeProfile')
      window.localStorage.removeItem('seeIdToken')
      window.localStorage.removeItem('seeSocxalAccessToken')
    }
    setIsReady(true)
  }

  return (
    <AuthContext.Provider value={{ profile, idToken, socxalToken, isReady, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
