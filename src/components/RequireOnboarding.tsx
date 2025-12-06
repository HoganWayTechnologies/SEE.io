import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOnboardingApi } from '../onboarding/hooks/useOnboardingApi'

type RequireOnboardingProps = {
  children: React.ReactElement
}

const COMPLETION_KEY = 'see_onboarding_complete'

const hasStoredCompletion = () =>
  typeof window !== 'undefined' && window.localStorage.getItem(COMPLETION_KEY) === 'true'

export default function RequireOnboarding({ children }: RequireOnboardingProps) {
  const { profile, idToken, isReady } = useAuth()
  const { fetchStatus } = useOnboardingApi()
  const [state, setState] = useState<'loading' | 'allow' | 'redirect'>(() => (hasStoredCompletion() ? 'allow' : 'loading'))

  useEffect(() => {
    let mounted = true
    if (!isReady) return
    if (!profile || !idToken) {
      setState('allow')
      return
    }
    if (hasStoredCompletion()) {
      setState('allow')
      return
    }
    const run = async () => {
      try {
        const status = await fetchStatus()
        if (!mounted) return
        if (!status || status.isComplete || status.completed) {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(COMPLETION_KEY, 'true')
          }
          setState('allow')
        } else {
          setState('redirect')
        }
      } catch (err) {
        console.debug('Onboarding guard skipped', err)
        if (mounted) setState('allow')
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [fetchStatus, profile, idToken, isReady])

  if (state === 'redirect') {
    return <Navigate to="/onboarding" replace />
  }

  if (state === 'loading') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
        Checking your onboarding status…
      </div>
    )
  }

  return children
}
