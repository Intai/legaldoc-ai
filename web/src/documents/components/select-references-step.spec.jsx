import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      const keys = {
        'newDocument.searchReferences': 'Search references...',
        'newDocument.filterAllTypes': 'All Types',
        'newDocument.filterContract': 'Contract',
        'newDocument.filterPolicy': 'Policy',
        'newDocument.filterEmployment': 'Employment',
        'newDocument.selectedSummary': `${opts?.count} references selected`,
        'newDocument.backButton': 'Back',
        'newDocument.nextButton': 'Next',
      }
      return keys[key] ?? key
    },
  }),
}))

jest.mock('lucide-react', () => ({
  Search: props => <svg data-testid="search-icon" {...props} />,
}))

jest.mock('@/shadcn/ui/input', () => ({
  Input: props => <input {...props} />,
}))

jest.mock('@/shadcn/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}))

jest.mock('@/shadcn/ui/select', () => ({
  Select: ({ children, value, onValueChange }) => (
    <div data-value={value} data-onvaluechange="true">
      {children}
      <input
        data-testid="type-filter-hidden"
        type="hidden"
        value={value}
        onChange={e => onValueChange(e.target.value)}
      />
    </div>
  ),
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children, value, ...props }) => (
    <option value={value} {...props}>{children}</option>
  ),
  SelectTrigger: ({ children, ...props }) => <div {...props}>{children}</div>,
  SelectValue: () => <span data-testid="select-value" />,
}))

jest.mock('./upload-area', () => {
  return function MockUploadArea() {
    return <div data-testid="upload-area" />
  }
})

jest.mock('./reference-list', () => {
  return function MockReferenceList({ references, selectedIds, onToggle }) {
    return (
      <div data-testid="reference-list" data-count={references.length}>
        {references.map(ref => (
          <div key={ref.id} data-testid={`ref-${ref.id}`}>
            <button data-testid={`toggle-${ref.id}`} onClick={() => onToggle(ref.id)}>
              {ref.title}
            </button>
          </div>
        ))}
        <span data-testid="selected-ids">{selectedIds.join(',')}</span>
      </div>
    )
  }
})

jest.mock('./selected-references-panel', () => {
  return function MockSelectedReferencesPanel({ references, onRemove }) {
    return (
      <div data-testid="selected-references-panel" data-count={references.length}>
        {references.map(ref => (
          <div key={ref.id} data-testid={`selected-${ref.id}`}>
            <button data-testid={`remove-${ref.id}`} onClick={() => onRemove(ref.id)}>
              {ref.title}
            </button>
          </div>
        ))}
      </div>
    )
  }
})

const mockState = {
  references: [
    { id: '1', title: 'NDA Template', type: 'Contract', description: 'NDA terms' },
    { id: '2', title: 'Service Agreement', type: 'Contract', description: 'Service terms' },
    { id: '3', title: 'Privacy Policy', type: 'Policy', description: 'Privacy data' },
  ],
  selectedReferenceIds: new Set(['1']),
  searchQuery: '',
  typeFilter: 'all',
  setSearchQuery: jest.fn(),
  setTypeFilter: jest.fn(),
  toggleReference: jest.fn(),
  removeReference: jest.fn(),
  goToStep: jest.fn(),
}

jest.mock('@/stores/new-document-store', () => ({
  useNewDocumentStore: selector => selector(mockState),
  useFilteredReferences: () => {
    const { references, searchQuery, typeFilter } = mockState
    return references.filter(ref => {
      const matchesQuery = !searchQuery || ref.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === 'all' || ref.type === typeFilter
      return matchesQuery && matchesType
    })
  },
  useSelectedReferences: () => {
    const { references, selectedReferenceIds } = mockState
    return references.filter(ref => selectedReferenceIds.has(ref.id))
  },
}))

import SelectReferencesStep from './select-references-step'

describe('SelectReferencesStep', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockState.selectedReferenceIds = new Set(['1'])
    mockState.searchQuery = ''
    mockState.typeFilter = 'all'
  })

  it('renders upload area, filter row, mobile summary, reference list, selected panel, and footer', () => {
    render(<SelectReferencesStep />)
    expect(screen.getByTestId('select-references-step')).toBeInTheDocument()
    expect(screen.getByTestId('upload-area')).toBeInTheDocument()
    expect(screen.getByTestId('filter-row')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-selected-summary')).toBeInTheDocument()
    expect(screen.getByTestId('reference-list')).toBeInTheDocument()
    expect(screen.getByTestId('selected-references-panel')).toBeInTheDocument()
    expect(screen.getByTestId('back-button')).toBeInTheDocument()
    expect(screen.getByTestId('next-button')).toBeInTheDocument()
  })

  it('renders search input with placeholder text', () => {
    render(<SelectReferencesStep />)
    const searchInput = screen.getByTestId('search-input')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput.getAttribute('placeholder')).toBe('Search references...')
  })

  it('calls setSearchQuery when typing in the search input', async () => {
    render(<SelectReferencesStep />)
    await userEvent.type(screen.getByTestId('search-input'), 'A')
    expect(mockState.setSearchQuery).toHaveBeenCalledWith('A')
  })

  it('renders the type filter select', () => {
    render(<SelectReferencesStep />)
    expect(screen.getByTestId('type-filter')).toBeInTheDocument()
  })

  it('displays mobile selected summary with count', () => {
    render(<SelectReferencesStep />)
    expect(screen.getByTestId('mobile-selected-summary')).toHaveTextContent('1 references selected')
  })

  it('passes filtered references and selectedIds to ReferenceList', () => {
    render(<SelectReferencesStep />)
    expect(screen.getByTestId('reference-list').getAttribute('data-count')).toBe('3')
    expect(screen.getByTestId('selected-ids')).toHaveTextContent('1')
  })

  it('passes selected references to SelectedReferencesPanel', () => {
    render(<SelectReferencesStep />)
    expect(screen.getByTestId('selected-references-panel').getAttribute('data-count')).toBe('1')
    expect(screen.getByTestId('selected-1')).toBeInTheDocument()
  })

  it('calls toggleReference when a reference is toggled', async () => {
    render(<SelectReferencesStep />)
    await userEvent.click(screen.getByTestId('toggle-2'))
    expect(mockState.toggleReference).toHaveBeenCalledWith('2')
  })

  it('calls removeReference when a reference is removed from the panel', async () => {
    render(<SelectReferencesStep />)
    await userEvent.click(screen.getByTestId('remove-1'))
    expect(mockState.removeReference).toHaveBeenCalledWith('1')
  })

  it('disables the Back button', () => {
    render(<SelectReferencesStep />)
    expect(screen.getByTestId('back-button')).toBeDisabled()
  })

  it('enables the Next button when at least one reference is selected', () => {
    render(<SelectReferencesStep />)
    expect(screen.getByTestId('next-button')).not.toBeDisabled()
  })

  it('disables the Next button when no references are selected', () => {
    mockState.selectedReferenceIds = new Set()
    render(<SelectReferencesStep />)
    expect(screen.getByTestId('next-button')).toBeDisabled()
  })

  it('calls goToStep(2) when Next button is clicked', async () => {
    render(<SelectReferencesStep />)
    await userEvent.click(screen.getByTestId('next-button'))
    expect(mockState.goToStep).toHaveBeenCalledWith(2)
  })

  it('applies md:hidden class to mobile summary and hidden md:block to selected panel', () => {
    render(<SelectReferencesStep />)
    expect(screen.getByTestId('mobile-selected-summary').className).toContain('md:hidden')
    expect(screen.getByTestId('selected-references-panel').parentElement.className).toContain('hidden')
    expect(screen.getByTestId('selected-references-panel').parentElement.className).toContain('md:block')
  })

  it('filters references by type when typeFilter is set', () => {
    mockState.typeFilter = 'Policy'
    render(<SelectReferencesStep />)
    expect(screen.getByTestId('reference-list').getAttribute('data-count')).toBe('1')
    expect(screen.getByTestId('ref-3')).toBeInTheDocument()
  })
})
