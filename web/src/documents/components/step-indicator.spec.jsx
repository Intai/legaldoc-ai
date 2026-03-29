import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'newDocument.stepSelectReferences': 'Select References',
        'newDocument.stepProvideContext': 'Provide Context',
        'newDocument.stepReviewSave': 'Review & Save',
      }
      return translations[key] || key
    },
  }),
}))

jest.mock('@/shadcn/lib/utils', () => ({
  cn: (...args) => args.filter(Boolean).join(' '),
}))

jest.mock('lucide-react', () => ({
  Check: props => <svg data-testid={props['data-testid']} {...props} />,
}))

import StepIndicator from './step-indicator'

describe('StepIndicator', () => {
  it('renders all three steps with labels and connectors', () => {
    render(<StepIndicator currentStep={1} onStepClick={() => {}} />)
    expect(screen.getByTestId('step-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('step-1')).toBeInTheDocument()
    expect(screen.getByTestId('step-2')).toBeInTheDocument()
    expect(screen.getByTestId('step-3')).toBeInTheDocument()
    expect(screen.getByText('Select References')).toBeInTheDocument()
    expect(screen.getByText('Provide Context')).toBeInTheDocument()
    expect(screen.getByText('Review & Save')).toBeInTheDocument()
    expect(screen.getByTestId('step-connector-1-2')).toBeInTheDocument()
    expect(screen.getByTestId('step-connector-2-3')).toBeInTheDocument()
  })

  it('applies active state to current step and upcoming to later steps', () => {
    render(<StepIndicator currentStep={1} onStepClick={() => {}} />)
    expect(screen.getByTestId('step-1')).toHaveAttribute('data-state', 'active')
    expect(screen.getByTestId('step-2')).toHaveAttribute('data-state', 'upcoming')
    expect(screen.getByTestId('step-3')).toHaveAttribute('data-state', 'upcoming')
    expect(screen.getByTestId('step-circle-1')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByTestId('step-circle-2')).not.toHaveAttribute('aria-current')
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('applies complete state with checkmarks and active state on step 2', () => {
    render(<StepIndicator currentStep={2} onStepClick={() => {}} />)
    expect(screen.getByTestId('step-1')).toHaveAttribute('data-state', 'complete')
    expect(screen.getByTestId('step-2')).toHaveAttribute('data-state', 'active')
    expect(screen.getByTestId('step-3')).toHaveAttribute('data-state', 'upcoming')
    expect(screen.getByTestId('step-check-1')).toBeInTheDocument()
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('marks all steps complete on step 3 with completed connectors', () => {
    render(<StepIndicator currentStep={3} onStepClick={() => {}} />)
    expect(screen.getByTestId('step-1')).toHaveAttribute('data-state', 'complete')
    expect(screen.getByTestId('step-2')).toHaveAttribute('data-state', 'complete')
    expect(screen.getByTestId('step-3')).toHaveAttribute('data-state', 'active')
    expect(screen.getByTestId('step-check-1')).toBeInTheDocument()
    expect(screen.getByTestId('step-check-2')).toBeInTheDocument()
    const connector12 = screen.getByTestId('step-connector-1-2')
    expect(connector12.className).toContain('bg-primary-300')
    const connector23 = screen.getByTestId('step-connector-2-3')
    expect(connector23.className).toContain('bg-primary-300')
  })

  it('calls onStepClick when clicking a completed step', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(<StepIndicator currentStep={3} onStepClick={handleClick} />)
    await user.click(screen.getByTestId('step-circle-1'))
    expect(handleClick).toHaveBeenCalledWith(1)
    await user.click(screen.getByTestId('step-circle-2'))
    expect(handleClick).toHaveBeenCalledWith(2)
  })

  it('does not call onStepClick when clicking an upcoming step', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(<StepIndicator currentStep={1} onStepClick={handleClick} />)
    await user.click(screen.getByTestId('step-circle-2'))
    await user.click(screen.getByTestId('step-circle-3'))
    expect(handleClick).not.toHaveBeenCalled()
  })
})
