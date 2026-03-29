import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('./step-indicator', () => {
  return function MockStepIndicator({ currentStep, onStepClick }) {
    return (
      <div data-testid="step-indicator" data-current-step={currentStep}>
        <button data-testid="step-click-1" onClick={() => onStepClick(1)}>Step 1</button>
        <button data-testid="step-click-2" onClick={() => onStepClick(2)}>Step 2</button>
        <button data-testid="step-click-3" onClick={() => onStepClick(3)}>Step 3</button>
      </div>
    )
  }
})

jest.mock('./select-references-step', () => {
  return function MockSelectReferencesStep() {
    return <div data-testid="select-references-step" />
  }
})

jest.mock('./provide-context-step', () => {
  return function MockProvideContextStep() {
    return <div data-testid="provide-context-step" />
  }
})

jest.mock('./review-save-step', () => {
  return function MockReviewSaveStep() {
    return <div data-testid="review-save-step" />
  }
})

const mockState = {
  currentStep: 1,
  goToStep: jest.fn(),
  fetchReferences: jest.fn(),
}

jest.mock('@/stores/new-document-store', () => ({
  useNewDocumentStore: selector => selector(mockState),
}))

import NewDocumentPage from './new-document-page'

describe('NewDocumentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockState.currentStep = 1
  })

  it('renders the page container, step indicator, and select-references-step on mount', () => {
    render(<NewDocumentPage />)
    expect(screen.getByTestId('new-document-page')).toBeInTheDocument()
    expect(screen.getByTestId('step-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('step-indicator').getAttribute('data-current-step')).toBe('1')
    expect(screen.getByTestId('select-references-step')).toBeInTheDocument()
  })

  it('calls fetchReferences on mount', () => {
    render(<NewDocumentPage />)
    expect(mockState.fetchReferences).toHaveBeenCalledTimes(1)
  })

  it('renders provide-context-step when currentStep is 2', () => {
    mockState.currentStep = 2
    render(<NewDocumentPage />)
    expect(screen.getByTestId('provide-context-step')).toBeInTheDocument()
    expect(screen.queryByTestId('select-references-step')).not.toBeInTheDocument()
  })

  it('renders review-save-step when currentStep is 3', () => {
    mockState.currentStep = 3
    render(<NewDocumentPage />)
    expect(screen.getByTestId('review-save-step')).toBeInTheDocument()
    expect(screen.queryByTestId('select-references-step')).not.toBeInTheDocument()
  })

  it('calls goToStep when clicking a completed step', async () => {
    mockState.currentStep = 2
    render(<NewDocumentPage />)
    await userEvent.click(screen.getByTestId('step-click-1'))
    expect(mockState.goToStep).toHaveBeenCalledWith(1)
  })

  it('does not call goToStep when clicking the current step', async () => {
    mockState.currentStep = 2
    render(<NewDocumentPage />)
    await userEvent.click(screen.getByTestId('step-click-2'))
    expect(mockState.goToStep).not.toHaveBeenCalled()
  })

  it('does not call goToStep when clicking a future step', async () => {
    mockState.currentStep = 1
    render(<NewDocumentPage />)
    await userEvent.click(screen.getByTestId('step-click-2'))
    expect(mockState.goToStep).not.toHaveBeenCalled()
  })
})
