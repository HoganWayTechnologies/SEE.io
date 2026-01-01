import React from 'react'

type Step = {
  label: string
  description?: string
}

export default function EventWizardStepper({ steps, activeStep }: { steps: Step[]; activeStep: number }) {
  return (
    <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {steps.map((step, index) => {
          const isActive = index === activeStep
          const isComplete = index < activeStep
          return (
            <div
              key={step.label}
              className={`chip ${isActive ? 'chip-active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderColor: isComplete ? 'var(--primary-blue)' : undefined
              }}
            >
              <span style={{ fontWeight: 600 }}>{index + 1}</span>
              <span>{step.label}</span>
            </div>
          )
        })}
      </div>
      {steps[activeStep]?.description && (
        <p style={{ margin: 0, color: 'var(--gray-600)' }}>{steps[activeStep].description}</p>
      )}
    </div>
  )
}
