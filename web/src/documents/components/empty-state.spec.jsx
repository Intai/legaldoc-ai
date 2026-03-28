import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('react-router-dom', () => ({
  Link: jest.fn(({ children, to, ...rest }) => (
    <a href={to} {...rest}>{children}</a>
  )),
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'documents.emptyTitle': 'No documents yet.',
        'documents.emptyDescription': 'Create your first document to get started.',
        'documents.emptyNewDocument': 'New Document',
        'documents.emptyFilterTitle': 'No documents match your filters.',
        'documents.emptyFilterDescription': 'Try adjusting your filters.',
      }
      return translations[key] || key
    },
  }),
}))

jest.mock('@/shadcn/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}))

jest.mock('lucide-react', () => ({
  FileText: props => <svg data-testid="empty-state-icon" {...props} />,
}))

import EmptyState from './empty-state'

describe('EmptyState', () => {
  it('shows empty state with icon and CTA when not filtered', () => {
    render(<EmptyState isFiltered={false} />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByTestId('empty-state-icon')).toBeInTheDocument()
    expect(screen.getByText('No documents yet.')).toBeInTheDocument()
    expect(screen.getByText('Create your first document to get started.')).toBeInTheDocument()
    const ctaLink = screen.getByText('New Document').closest('a')
    expect(ctaLink).toHaveAttribute('href', '/documents/new')
  })

  it('shows filter-empty state without CTA when filtered', () => {
    render(<EmptyState isFiltered={true} />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByTestId('empty-state-icon')).toBeInTheDocument()
    expect(screen.getByText('No documents match your filters.')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your filters.')).toBeInTheDocument()
    expect(screen.queryByText('New Document')).not.toBeInTheDocument()
  })
})
