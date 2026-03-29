import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => key,
  }),
}))

jest.mock('date-fns', () => ({
  format: jest.fn(() => 'Mar 20'),
}))

jest.mock('@/shadcn/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, className, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={onCheckedChange}
      className={className}
      {...props}
    />
  ),
}))

import ReferenceList from './reference-list'

const mockReferences = [
  { id: '1', title: 'NDA Template', description: 'Standard NDA terms and conditions for confidential...', type: 'Contract', createdAt: '2026-03-20T00:00:00Z' },
  { id: '2', title: 'Privacy Policy Template', description: 'Privacy policy for data collection and processing...', type: 'Policy', createdAt: '2026-03-10T00:00:00Z' },
  { id: '3', title: 'Employment Handbook', description: 'Company employment policies and terms covering...', type: 'Employment', createdAt: '2026-02-28T00:00:00Z' },
]

describe('ReferenceList', () => {
  it('renders all references with title, description, type badge, and formatted date', () => {
    render(<ReferenceList references={mockReferences} selectedIds={[]} onToggle={() => {}} />)
    expect(screen.getByTestId('reference-list')).toBeInTheDocument()
    expect(screen.getByText('NDA Template')).toBeInTheDocument()
    expect(screen.getByText('Privacy Policy Template')).toBeInTheDocument()
    expect(screen.getByText('Employment Handbook')).toBeInTheDocument()
    expect(screen.getByText('Standard NDA terms and conditions for confidential...')).toBeInTheDocument()
    expect(screen.getByText('Contract')).toBeInTheDocument()
    expect(screen.getByText('Policy')).toBeInTheDocument()
    expect(screen.getByText('Employment')).toBeInTheDocument()
    expect(screen.getAllByText('Mar 20')).toHaveLength(3)
    expect(screen.getByTestId('reference-item-1')).toBeInTheDocument()
    expect(screen.getByTestId('reference-item-2')).toBeInTheDocument()
    expect(screen.getByTestId('reference-item-3')).toBeInTheDocument()
  })

  it('renders checkboxes as checked for selected references', () => {
    render(<ReferenceList references={mockReferences} selectedIds={['1', '3']} onToggle={() => {}} />)
    expect(screen.getByTestId('reference-checkbox-1')).toBeChecked()
    expect(screen.getByTestId('reference-checkbox-2')).not.toBeChecked()
    expect(screen.getByTestId('reference-checkbox-3')).toBeChecked()
  })

  it('applies primary-50 background to checked items', () => {
    render(<ReferenceList references={mockReferences} selectedIds={['1']} onToggle={() => {}} />)
    expect(screen.getByTestId('reference-item-1').className).toContain('bg-primary-50')
    expect(screen.getByTestId('reference-item-2').className).not.toContain('bg-primary-50')
  })

  it('calls onToggle with the correct id when a checkbox is clicked', async () => {
    const onToggle = jest.fn()
    render(<ReferenceList references={mockReferences} selectedIds={[]} onToggle={onToggle} />)
    await userEvent.click(screen.getByTestId('reference-checkbox-2'))
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('2')
  })

  it('renders border separator between items but not after the last item', () => {
    render(<ReferenceList references={mockReferences} selectedIds={[]} onToggle={() => {}} />)
    expect(screen.getByTestId('reference-item-1').className).toContain('border-b')
    expect(screen.getByTestId('reference-item-2').className).toContain('border-b')
    expect(screen.getByTestId('reference-item-3').className).not.toContain('border-b')
  })

  it('formats dates using date-fns format', () => {
    const { format: mockFormat } = require('date-fns')
    mockFormat.mockClear()
    render(<ReferenceList references={mockReferences} selectedIds={[]} onToggle={() => {}} />)
    expect(mockFormat).toHaveBeenCalledTimes(3)
    expect(mockFormat).toHaveBeenCalledWith(expect.any(Date), 'MMM d')
  })
})
