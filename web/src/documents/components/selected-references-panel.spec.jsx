import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      const translations = {
        'newDocument.selectedHeader': `Selected (${opts?.count ?? 0})`,
        'newDocument.selectedEmpty': 'No references selected',
      }
      return translations[key] || key
    },
  }),
}))

jest.mock('lucide-react', () => ({
  X: props => <svg data-testid="x-icon" {...props} />,
}))

import SelectedReferencesPanel from './selected-references-panel'

const mockReferences = [
  { id: '1', title: 'NDA Template', type: 'Contract' },
  { id: '2', title: 'Privacy Policy Template', type: 'Policy' },
]

describe('SelectedReferencesPanel', () => {
  it('renders empty state when no references are selected', () => {
    render(<SelectedReferencesPanel references={[]} onRemove={() => {}} />)
    expect(screen.getByTestId('selected-references-panel')).toBeInTheDocument()
    expect(screen.getByText('Selected (0)')).toBeInTheDocument()
    expect(screen.getByTestId('selected-references-empty')).toBeInTheDocument()
    expect(screen.getByText('No references selected')).toBeInTheDocument()
    expect(screen.queryByTestId('selected-references-list')).not.toBeInTheDocument()
  })

  it('renders selected references with titles, type badges, and remove buttons', () => {
    render(<SelectedReferencesPanel references={mockReferences} onRemove={() => {}} />)
    expect(screen.getByText('Selected (2)')).toBeInTheDocument()
    expect(screen.queryByTestId('selected-references-empty')).not.toBeInTheDocument()
    expect(screen.getByTestId('selected-references-list')).toBeInTheDocument()
    expect(screen.getByText('NDA Template')).toBeInTheDocument()
    expect(screen.getByText('Privacy Policy Template')).toBeInTheDocument()
    expect(screen.getByText('Contract')).toBeInTheDocument()
    expect(screen.getByText('Policy')).toBeInTheDocument()
    expect(screen.getByTestId('selected-reference-1')).toBeInTheDocument()
    expect(screen.getByTestId('selected-reference-2')).toBeInTheDocument()
    expect(screen.getByTestId('selected-reference-remove-1')).toBeInTheDocument()
    expect(screen.getByTestId('selected-reference-remove-2')).toBeInTheDocument()
  })

  it('calls onRemove with the correct id when remove button is clicked', async () => {
    const onRemove = jest.fn()
    render(<SelectedReferencesPanel references={mockReferences} onRemove={onRemove} />)
    await userEvent.click(screen.getByTestId('selected-reference-remove-1'))
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith('1')
  })

  it('renders border separator only between items, not on the first item', () => {
    render(<SelectedReferencesPanel references={mockReferences} onRemove={() => {}} />)
    const firstItem = screen.getByTestId('selected-reference-1')
    const secondItem = screen.getByTestId('selected-reference-2')
    expect(firstItem.className).not.toContain('border-t')
    expect(secondItem.className).toContain('border-t')
  })
})
