export type OnboardingStepKey =
  | 'welcome'
  | 'goals'
  | 'business_intro'
  | 'business_details'
  | 'location'
  | 'preferences'
  | 'complete'

export const BUSINESS_GOALS = ['host_events', 'promote_events'] as const

export const requiresBusinessFlow = (goals: string[]) =>
  goals.some(goal => BUSINESS_GOALS.includes(goal as (typeof BUSINESS_GOALS)[number]))

export const normalizeStepKey = (step?: string | null): OnboardingStepKey => {
  const normalized = (step || '').toLowerCase()
  switch (normalized) {
    case 'welcome':
    case 'start':
      return 'welcome'
    case 'goals':
      return 'goals'
    case 'business_intro':
    case 'businessintro':
      return 'business_intro'
    case 'business_details':
    case 'businessdetails':
    case 'business':
      return 'business_details'
    case 'location':
      return 'location'
    case 'preferences':
    case 'profile':
      return 'preferences'
    case 'complete':
    case 'completed':
    case 'done':
      return 'complete'
    default:
      return 'welcome'
  }
}
