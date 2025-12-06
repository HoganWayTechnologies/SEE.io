import React, { useState } from 'react'
import { useOnboardingApi } from '../hooks/useOnboardingApi'

type GoalSelectProps = {
  initialGoals?: string[]
  onNext: (goals: string[]) => void
}

const GOAL_OPTIONS = [
  { value: 'find_events', label: 'Find events' },
  { value: 'host_events', label: 'Host events' },
  { value: 'promote_events', label: 'Promote events' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'arts', label: 'Arts & culture' },
  { value: 'browse', label: 'Just browsing' }
]

export default function GoalSelect({ initialGoals = [], onNext }: GoalSelectProps) {
  const [selected, setSelected] = useState<string[]>(initialGoals)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { saveGoals, saveProgress } = useOnboardingApi()

  const toggleGoal = (goal: string) => {
    setSelected(prev =>
      prev.includes(goal) ? prev.filter(item => item !== goal) : [...prev, goal]
    )
  }

  const handleContinue = async () => {
    if (selected.length === 0) {
      setError('Pick at least one goal so we can personalize SEE.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await saveGoals(selected)
      await saveProgress('goals')
      onNext(selected)
    } catch (err: any) {
      setError(err?.message || 'Unable to save goals right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <p style={{ textTransform: 'uppercase', color: 'var(--primary-blue)', fontSize: '0.85rem', letterSpacing: '0.08em' }}>
              Step 2 of 6
            </p>
            <h1 style={{ margin: '0.25rem 0' }}>What brings you to SEE?</h1>
            <p style={{ color: 'var(--gray-600)' }}>Pick all that apply.</p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: 'var(--error-red)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {GOAL_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleGoal(option.value)}
                className={`chip ${selected.includes(option.value) ? 'chip-active' : ''}`}
                style={{ minWidth: '140px' }}
                disabled={loading}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleContinue} disabled={loading}>
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
