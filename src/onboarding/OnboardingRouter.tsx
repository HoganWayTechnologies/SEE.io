import React, { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOnboardingState } from './hooks/useOnboardingState'
import { requiresBusinessFlow } from './types'
import Welcome from './steps/Welcome'
import GoalSelect from './steps/GoalSelect'
import BusinessIntro from './steps/BusinessIntro'
import BusinessDetails from './steps/BusinessDetails'
import LocationSelect from './steps/LocationSelect'
import Preferences from './steps/Preferences'
import Complete from './steps/Complete'

export default function OnboardingRouter() {
  const { profile, idToken, isReady } = useAuth()
  const navigate = useNavigate()
  const { step, setStep, goals, setGoals, loading, completed, markComplete } = useOnboardingState()

  useEffect(() => {
    if (completed) {
      navigate('/', { replace: true })
    }
  }, [completed, navigate])

  if (isReady && (!profile || !idToken)) {
    return <Navigate to="/auth" replace />
  }

  if (!isReady || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card">
          <div className="card-body">Loading your onboarding experience…</div>
        </div>
      </div>
    )
  }

  const handleGoalsNext = (nextGoals: string[]) => {
    setGoals(nextGoals)
    if (requiresBusinessFlow(nextGoals)) {
      setStep('business_intro')
    } else {
      setStep('location')
    }
  }

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return <Welcome onNext={() => setStep('goals')} />
      case 'goals':
        return <GoalSelect initialGoals={goals} onNext={handleGoalsNext} />
      case 'business_intro':
        return (
          <BusinessIntro
            onNext={(choice) => {
              if (choice === 'business') {
                setStep('business_details')
              } else {
                setStep('location')
              }
            }}
          />
        )
      case 'business_details':
        return <BusinessDetails onNext={() => setStep('location')} />
      case 'location':
        return (
          <LocationSelect
            onNext={() => setStep('preferences')}
            onSkip={() => setStep('preferences')}
          />
        )
      case 'preferences':
        return <Preferences onNext={() => setStep('complete')} />
      case 'complete':
        return <Complete onFinish={() => { markComplete('complete'); navigate('/', { replace: true }) }} />
      default:
        return <Welcome onNext={() => setStep('goals')} />
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', padding: '2rem 1rem' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        {renderStep()}
      </div>
    </div>
  )
}
