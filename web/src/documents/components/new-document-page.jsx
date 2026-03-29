import React, { useEffect } from 'react'
import { useNewDocumentStore } from '@/stores/new-document-store'
import ProvideContextStep from './provide-context-step'
import ReviewSaveStep from './review-save-step'
import SelectReferencesStep from './select-references-step'
import StepIndicator from './step-indicator'

const STEP_COMPONENTS = {
  1: SelectReferencesStep,
  2: ProvideContextStep,
  3: ReviewSaveStep,
}

function NewDocumentPage() {
  const currentStep = useNewDocumentStore(state => state.currentStep)
  const goToStep = useNewDocumentStore(state => state.goToStep)
  const fetchReferences = useNewDocumentStore(state => state.fetchReferences)

  useEffect(() => {
    fetchReferences()
  }, [])

  const handleStepClick = step => {
    if (step < currentStep) {
      goToStep(step)
    }
  }

  const StepComponent = STEP_COMPONENTS[currentStep]

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="new-document-page">
      <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />
      <div className="flex min-h-0 flex-1 flex-col">
        <StepComponent />
      </div>
    </div>
  )
}

export default NewDocumentPage
