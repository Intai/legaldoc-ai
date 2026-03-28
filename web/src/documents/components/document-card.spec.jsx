import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('react-router-dom', () => ({
  Link: jest.fn(({ children, to, ...rest }) => (
    <a href={to} {...rest}>{children}</a>
  )),
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      const translations = {
        'documents.statusDone': 'Done',
        'documents.statusDraft': 'Draft',
        'documents.statusGenerating': 'Generating',
        'documents.pages': `${params?.count} pages`,
      }
      return translations[key] || key
    },
  }),
}))

jest.mock('@/shadcn/ui/card', () => ({
  Card: ({ children, ...props }) => <div data-slot="card" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }) => <div data-slot="card-header" {...props}>{children}</div>,
  CardContent: ({ children, ...props }) => <div data-slot="card-content" {...props}>{children}</div>,
}))

jest.mock('date-fns', () => ({
  format: jest.fn((_date, _fmt) => 'Mar 25, 2026'),
  formatDistanceToNow: jest.fn(() => '2 days ago'),
}))

import DocumentCard from './document-card'

const mockDocument = {
  id: 'doc-1',
  title: 'NDA Agreement',
  status: 'Done',
  type: 'NDA',
  description: 'This Non-Disclosure Agreement is entered into between the parties.',
  createdAt: '2026-03-25T10:00:00Z',
  pageCount: 3,
}

describe('DocumentCard', () => {
  it('renders title, status badge, type badge, description, and page count', () => {
    render(<DocumentCard document={mockDocument} />)

    expect(screen.getByText('NDA Agreement')).toBeInTheDocument()
    expect(screen.getByTestId('status-badge-doc-1')).toHaveTextContent('Done')
    expect(screen.getByTestId('type-badge-doc-1')).toHaveTextContent('NDA')
    expect(screen.getByText(/This Non-Disclosure Agreement/)).toBeInTheDocument()
    expect(screen.getByText('3 pages')).toBeInTheDocument()
  })

  it('renders as a clickable link to the document detail page', () => {
    render(<DocumentCard document={mockDocument} />)
    const link = screen.getByTestId('document-card-doc-1')
    expect(link).toHaveAttribute('href', '/documents/doc-1')
  })

  it('does not render page count when pageCount is null', () => {
    render(<DocumentCard document={{ ...mockDocument, pageCount: null }} />)
    expect(screen.queryByText(/pages/)).not.toBeInTheDocument()
  })

  it('formats dates older than 7 days as absolute dates', () => {
    const { format: mockFormat, formatDistanceToNow: mockFDTN } = require('date-fns')
    mockFormat.mockReturnValue('Mar 1, 2026')
    mockFDTN.mockReturnValue('30 days ago')

    const oldDoc = { ...mockDocument, createdAt: '2026-03-01T10:00:00Z' }
    render(<DocumentCard document={oldDoc} />)

    expect(mockFormat).toHaveBeenCalled()
  })

  it('renders raw status when status is not in the known status map', () => {
    render(<DocumentCard document={{ ...mockDocument, status: 'Unknown' }} />)
    expect(screen.getByTestId('status-badge-doc-1')).toHaveTextContent('Unknown')
  })
})
