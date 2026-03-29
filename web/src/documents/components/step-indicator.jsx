import React from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { cn } from '@/shadcn/lib/utils'

const STEPS = [
  { number: 1, labelKey: 'newDocument.stepSelectReferences' },
  { number: 2, labelKey: 'newDocument.stepProvideContext' },
  { number: 3, labelKey: 'newDocument.stepReviewSave' },
]

function getStepState(stepNumber, currentStep) {
  if (stepNumber < currentStep) return 'complete'
  if (stepNumber === currentStep) return 'active'
  return 'upcoming'
}

function StepIndicator({ currentStep, onStepClick }) {
  const { t } = useTranslation()

  return (
    <div
      className="flex shrink-0 items-center justify-center gap-2 bg-bg-page p-4 md:p-6"
      data-testid="step-indicator"
    >
      {STEPS.map((step, index) => {
        const state = getStepState(step.number, currentStep)

        return (
          <React.Fragment key={step.number}>
            <div
              className="flex items-center gap-2"
              data-testid={`step-${step.number}`}
              data-state={state}
            >
              <button
                type="button"
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-[background,color,border-color] duration-[120ms] ease-linear',
                  state === 'complete' && 'bg-primary-700 text-white cursor-pointer',
                  state === 'active' && 'border-2 border-primary-400 bg-primary-100 text-primary-700 cursor-pointer',
                  state === 'upcoming' && 'border border-border-default bg-neutral-100 text-neutral-400 cursor-default',
                )}
                onClick={state === 'complete' ? () => onStepClick(step.number) : undefined}
                aria-current={state === 'active' ? 'step' : undefined}
                data-testid={`step-circle-${step.number}`}
              >
                {state === 'complete' ? (
                  <Check className="size-3.5" strokeWidth={3} data-testid={`step-check-${step.number}`} />
                ) : (
                  <span>{step.number}</span>
                )}
              </button>
              <span
                className={cn(
                  'hidden text-sm font-medium md:inline',
                  state === 'complete' && 'text-primary-700',
                  state === 'active' && 'font-semibold text-neutral-800',
                  state === 'upcoming' && 'text-neutral-400',
                )}
                data-testid={`step-label-${step.number}`}
              >
                {t(step.labelKey)}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px w-10 shrink-0 bg-border-default',
                  step.number < currentStep && 'bg-primary-300',
                )}
                data-testid={`step-connector-${step.number}-${step.number + 1}`}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default StepIndicator
