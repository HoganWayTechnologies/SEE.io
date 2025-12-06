import { useCallback, useEffect, useState } from 'react'
import { useOnboardingApi } from './useOnboardingApi'
import { OnboardingStepKey, normalizeStepKey } from '../types'

const LOCAL_STORAGE_KEY = 'see_onboarding_step_key'
const COMPLETE_STORAGE_KEY = 'see_onboarding_complete'

const getInitialStep = (): OnboardingStepKey => {
  if (typeof window === 'undefined') return 'welcome'
  const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)
  return stored ? normalizeStepKey(stored) : 'welcome'
}

const setCompleteFlag = (value: boolean) => {
  if (typeof window === 'undefined') return
  if (value) {
    window.localStorage.setItem(COMPLETE_STORAGE_KEY, 'true')
  } else {
    window.localStorage.removeItem(COMPLETE_STORAGE_KEY)
  }
}

export function useOnboardingState() {
  const [step, setStepState] = useState<OnboardingStepKey>(getInitialStep)
  const [goals, setGoals] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const { fetchStatus } = useOnboardingApi()

  const persistStep = useCallback((next: OnboardingStepKey) => {
    setStepState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, next)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const status = await fetchStatus()
        if (!mounted || !status) {
          setLoading(false)
          return
        }
        if (Array.isArray(status.goals) && status.goals.length) {
          setGoals(status.goals)
        }
        if (status.isComplete || status.completed) {
          setCompleted(true)
          persistStep('complete')
          setCompleteFlag(true)
          setLoading(false)
          return
        }
        const normalizedStep = status.step ? normalizeStepKey(status.step) : 'welcome'
        const completedSteps: string[] = Array.isArray(status.completedSteps)
          ? status.completedSteps.map(step => (step || '').toLowerCase())
          : []
        if (completedSteps.includes('preferences') || completedSteps.includes('complete')) {
          persistStep('complete')
          setCompleteFlag(true)
        } else if (completedSteps.includes('location')) {
          persistStep('preferences')
          setCompleteFlag(false)
        } else if (completedSteps.includes('goals')) {
          persistStep('location')
          setCompleteFlag(false)
        } else if (status.step) {
          persistStep(normalizedStep)
          setCompleteFlag(false)
        }
      } catch (err) {
        console.debug('Onboarding status unavailable', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [fetchStatus, persistStep])

  return {
    step,
    setStep: persistStep,
    goals,
    setGoals,
    loading,
    completed,
    markComplete: (nextStep: OnboardingStepKey = 'complete') => {
      setCompleted(true)
      persistStep(nextStep)
      setCompleteFlag(true)
    }
  }
}
