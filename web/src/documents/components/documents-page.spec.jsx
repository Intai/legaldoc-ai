import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

const mockFetchDocuments = jest.fn()
const mockFetchMore = jest.fn()
const mockSetSort = jest.fn()
const mockSetTypeFilter = jest.fn()

let mockStoreState = {}

jest.mock('../../stores/documents-store.js', () => ({
  useDocumentsStore: jest.fn(selector => selector(mockStoreState)),
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'documents.title': 'Documents',
        'documents.sortMostRecent': 'Most Recent',
        'documents.sortAlphabetical': 'A-Z',
        'documents.filterAllTypes': 'All Types',
        'documents.filterContract': 'Contract',
        'documents.filterPolicy': 'Policy',
        'documents.filterEmployment': 'Employment',
        'documents.filterNda': 'NDA',
        'documents.loadMore': 'Load more',
      }
      return translations[key] || key
    },
  }),
}))

jest.mock('@/shadcn/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}))

jest.mock('@/shadcn/ui/select', () => {
  const React = require('react')
  return {
    Select: ({ children, value, onValueChange, disabled }) => (
      <div data-slot="select" data-value={value} data-disabled={disabled}>
        {React.Children.map(children, child =>
          React.isValidElement(child)
            ? React.cloneElement(child, { _onValueChange: onValueChange, _value: value })
            : child
        )}
      </div>
    ),
    SelectTrigger: ({ children, _onValueChange, _value, ...props }) => (
      <button data-slot="select-trigger" {...props}>{_value}{children}</button>
    ),
    SelectValue: () => null,
    SelectContent: ({ children, _onValueChange, _value }) => (
      <div data-slot="select-content">
        {React.Children.map(children, child =>
          React.isValidElement(child)
            ? React.cloneElement(child, { _onValueChange })
            : child
        )}
      </div>
    ),
    SelectItem: ({ children, value, _onValueChange, ...props }) => (
      <div
        data-slot="select-item"
        data-value={value}
        onClick={() => _onValueChange?.(value)}
        {...props}
      >
        {children}
      </div>
    ),
  }
})

jest.mock('lucide-react', () => ({
  Loader2: props => <svg data-testid="loader-icon" {...props} />,
}))

jest.mock('./document-card.jsx', () => {
  return function MockDocumentCard({ document }) {
    return <div data-testid={`document-card-${document.id}`}>{document.title}</div>
  }
})

jest.mock('./empty-state.jsx', () => {
  return function MockEmptyState({ isFiltered }) {
    return <div data-testid="empty-state" data-filtered={isFiltered} />
  }
})

jest.mock('./skeleton-grid.jsx', () => {
  return function MockSkeletonGrid() {
    return <div data-testid="skeleton-grid" />
  }
})

import DocumentsPage from './documents-page'

const mockDocuments = [
  { id: 'doc-1', title: 'NDA Agreement', status: 'done', type: 'NDA' },
  { id: 'doc-2', title: 'Employment Contract', status: 'draft', type: 'Employment' },
  { id: 'doc-3', title: 'Privacy Policy', status: 'generating', type: 'Policy' },
]

function buildStoreState(overrides = {}) {
  return {
    documents: mockDocuments,
    sort: 'recent',
    typeFilter: 'all',
    loading: false,
    loadingMore: false,
    nextCursor: null,
    fetchDocuments: mockFetchDocuments,
    fetchMore: mockFetchMore,
    setSort: mockSetSort,
    setTypeFilter: mockSetTypeFilter,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockStoreState = buildStoreState()
})

describe('DocumentsPage', () => {
  it('renders page title and document cards', () => {
    render(<DocumentsPage />)
    expect(screen.getByTestId('page-title')).toHaveTextContent('Documents')
    expect(screen.getByText('NDA Agreement')).toBeInTheDocument()
    expect(screen.getByText('Employment Contract')).toBeInTheDocument()
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('calls fetchDocuments on mount when no documents loaded', () => {
    mockStoreState = buildStoreState({ documents: [] })
    render(<DocumentsPage />)
    expect(mockFetchDocuments).toHaveBeenCalledTimes(1)
  })

  it('skips fetchDocuments on mount when documents already loaded', () => {
    render(<DocumentsPage />)
    expect(mockFetchDocuments).not.toHaveBeenCalled()
  })

  it('triggers setSort when a sort option is clicked', () => {
    render(<DocumentsPage />)
    fireEvent.click(screen.getByText('A-Z'))
    expect(mockSetSort).toHaveBeenCalledWith('alpha')
  })

  it('triggers setTypeFilter when a type filter option is clicked', () => {
    render(<DocumentsPage />)
    const contractOption = screen.getAllByText('Contract')[0]
    fireEvent.click(contractOption)
    expect(mockSetTypeFilter).toHaveBeenCalledWith('Contract')
  })

  it('renders skeleton grid when loading is true', () => {
    mockStoreState = buildStoreState({ loading: true, documents: [] })
    render(<DocumentsPage />)
    expect(screen.getByTestId('skeleton-grid')).toBeInTheDocument()
    expect(screen.queryByTestId('card-grid')).not.toBeInTheDocument()
  })

  it('disables sort and filter dropdowns during loading', () => {
    mockStoreState = buildStoreState({ loading: true, documents: [] })
    render(<DocumentsPage />)
    const selects = screen.getByTestId('controls-row').querySelectorAll('[data-slot="select"]')
    selects.forEach(select => {
      expect(select.dataset.disabled).toBe('true')
    })
  })

  it('shows empty state when no documents and no filter', () => {
    mockStoreState = buildStoreState({ documents: [] })
    render(<DocumentsPage />)
    const emptyState = screen.getByTestId('empty-state')
    expect(emptyState).toBeInTheDocument()
    expect(emptyState.dataset.filtered).toBe('false')
  })

  it('shows empty state with filtered flag when filter active but no results', () => {
    mockStoreState = buildStoreState({ documents: [], typeFilter: 'NDA' })
    render(<DocumentsPage />)
    const emptyState = screen.getByTestId('empty-state')
    expect(emptyState).toBeInTheDocument()
    expect(emptyState.dataset.filtered).toBe('true')
  })

  it('shows load more button when nextCursor exists', () => {
    mockStoreState = buildStoreState({ nextCursor: 'cursor-abc' })
    render(<DocumentsPage />)
    const loadMoreBtn = screen.getByTestId('load-more-button')
    expect(loadMoreBtn).toHaveTextContent('Load more')

    fireEvent.click(loadMoreBtn)
    expect(mockFetchMore).toHaveBeenCalledTimes(1)
  })

  it('disables load more button and shows spinner when loadingMore is true', () => {
    mockStoreState = buildStoreState({ nextCursor: 'cursor-abc', loadingMore: true })
    render(<DocumentsPage />)
    const loadMoreBtn = screen.getByTestId('load-more-button')
    expect(loadMoreBtn).toBeDisabled()
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
  })

  it('hides load more button when nextCursor is null', () => {
    mockStoreState = buildStoreState({ nextCursor: null })
    render(<DocumentsPage />)
    expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument()
  })
})
