import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  api,
  ConvertUserToBusinessRequest,
  OnboardingLocationRequest,
  OnboardingStatus,
  UserPreferences,
  getUserIdFromProfile
} from '../../services/api'
import { OnboardingStepKey } from '../types'

type UseOnboardingApiResult = {
  fetchStatus: () => Promise<OnboardingStatus | null>
  saveProgress: (step: OnboardingStepKey) => Promise<any>
  saveGoals: (goals: string[]) => Promise<any>
  saveLocation: (payload: OnboardingLocationRequest) => Promise<any>
  convertToBusiness: (payload: ConvertUserToBusinessRequest) => Promise<any>
  updatePreferences: (payload: UserPreferences) => Promise<any>
}

const stepOrder: OnboardingStepKey[] = [
  'welcome',
  'goals',
  'business_intro',
  'business_details',
  'location',
  'preferences',
  'complete'
]

const nextStepMap: Record<OnboardingStepKey, OnboardingStepKey | null> = {
  welcome: 'goals',
  goals: 'business_intro',
  business_intro: 'business_details',
  business_details: 'location',
  location: 'preferences',
  preferences: 'complete',
  complete: null
}

export function useOnboardingApi(): UseOnboardingApiResult {
  const { profile, idToken } = useAuth()
  const userId = getUserIdFromProfile(profile)

  return useMemo(() => {
    const ensureAuth = () => {
      if (!userId || !idToken) {
        throw new Error('You need to be signed in to continue onboarding.')
      }
    }

    return {
      fetchStatus: async () => {
        if (!userId || !idToken) return null
        const raw = await api.fetchOnboardingStatus(userId, idToken)
        if (!raw) return null
        const normalizedStep =
          raw.step ??
          raw.Step ??
          raw.nextStep ??
          raw.NextStep ??
          null
        return {
          ...raw,
          step: normalizedStep,
          isComplete: Boolean(raw.isComplete ?? raw.completed ?? raw.Completed)
        }
      },
      saveProgress: async (step: OnboardingStepKey) => {
        ensureAuth()
        const index = stepOrder.indexOf(step)
        const stepsMap = stepOrder.reduce((acc, current, currentIdx) => {
          if (currentIdx <= index) acc[current] = true
          return acc
        }, {} as Record<string, boolean>)
        const nextStep = nextStepMap[step]
        return api.saveOnboardingProgress(userId!, idToken!, {
          steps: stepsMap,
          nextStep: nextStep || null,
          completed: step === 'complete'
        })
      },
      saveGoals: async (goals: string[]) => {
        ensureAuth()
        return api.saveOnboardingGoals(userId!, idToken!, { goals })
      },
      saveLocation: async (payload: OnboardingLocationRequest) => {
        ensureAuth()
        return api.saveOnboardingLocation(userId!, idToken!, payload)
      },
      convertToBusiness: async (payload: ConvertUserToBusinessRequest) => {
        ensureAuth()
        return api.convertUserToBusiness(userId!, idToken!, payload)
      },
      updatePreferences: async (payload: UserPreferences) => {
        ensureAuth()
        return api.updateUserPreferences(userId!, idToken!, payload)
      }
    }
  }, [userId, idToken])
}
