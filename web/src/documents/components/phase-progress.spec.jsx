import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'newDocument.phaseAnalyzing': 'Analyzing references...',
        'newDocument.phaseStructuring': 'Structuring document...',
        'newDocument.phaseDrafting': 'Drafting content...',
        'newDocument.phaseFinalizing': 'Finalizing document...',
      }
      return translations[key] || key
    },
  }),
}))

jest.mock('lucide-react', () => ({
  Check: props => <svg data-testid="icon-check" {...props} />,
  Circle: props => <svg data-testid="icon-circle" {...props} />,
  Loader2: props => <svg data-testid="icon-loader" {...props} />,
}))

import PhaseProgress from './phase-progress'

describe('PhaseProgress', () => {
  it('renders all four phases with pending icons when currentPhase is null', () => {
    render(<PhaseProgress currentPhase={null} />)
    expect(screen.getByTestId('phase-progress')).toBeInTheDocument()
    expect(screen.getByText('Analyzing references...')).toBeInTheDocument()
    expect(screen.getByText('Structuring document...')).toBeInTheDocument()
    expect(screen.getByText('Drafting content...')).toBeInTheDocument()
    expect(screen.getByText('Finalizing document...')).toBeInTheDocument()
    expect(screen.getAllByTestId('phase-icon-pending')).toHaveLength(4)
    expect(screen.queryByTestId('phase-icon-check')).not.toBeInTheDocument()
    expect(screen.queryByTestId('phase-icon-spinner')).not.toBeInTheDocument()
  })

  it('shows spinner on analyzing and pending on the rest when currentPhase is analyzing', () => {
    render(<PhaseProgress currentPhase="analyzing" />)
    expect(screen.getByTestId('phase-item-analyzing').querySelector('[data-testid="phase-icon-spinner"]')).toBeInTheDocument()
    expect(screen.getAllByTestId('phase-icon-pending')).toHaveLength(3)
    expect(screen.queryByTestId('phase-icon-check')).not.toBeInTheDocument()
  })

  it('shows check on analyzing, spinner on structuring, and pending on the rest when currentPhase is structuring', () => {
    render(<PhaseProgress currentPhase="structuring" />)
    expect(screen.getByTestId('phase-item-analyzing').querySelector('[data-testid="phase-icon-check"]')).toBeInTheDocument()
    expect(screen.getByTestId('phase-item-structuring').querySelector('[data-testid="phase-icon-spinner"]')).toBeInTheDocument()
    expect(screen.getAllByTestId('phase-icon-pending')).toHaveLength(2)
  })

  it('shows checks on first two, spinner on drafting, and pending on finalizing when currentPhase is drafting', () => {
    render(<PhaseProgress currentPhase="drafting" />)
    expect(screen.getAllByTestId('phase-icon-check')).toHaveLength(2)
    expect(screen.getByTestId('phase-item-drafting').querySelector('[data-testid="phase-icon-spinner"]')).toBeInTheDocument()
    expect(screen.getAllByTestId('phase-icon-pending')).toHaveLength(1)
  })

  it('shows checks on first three and spinner on finalizing when currentPhase is finalizing', () => {
    render(<PhaseProgress currentPhase="finalizing" />)
    expect(screen.getAllByTestId('phase-icon-check')).toHaveLength(3)
    expect(screen.getByTestId('phase-item-finalizing').querySelector('[data-testid="phase-icon-spinner"]')).toBeInTheDocument()
    expect(screen.queryByTestId('phase-icon-pending')).not.toBeInTheDocument()
  })

  it('shows all check icons when currentPhase is complete', () => {
    render(<PhaseProgress currentPhase="complete" />)
    expect(screen.getAllByTestId('phase-icon-check')).toHaveLength(4)
    expect(screen.queryByTestId('phase-icon-spinner')).not.toBeInTheDocument()
    expect(screen.queryByTestId('phase-icon-pending')).not.toBeInTheDocument()
  })
})
