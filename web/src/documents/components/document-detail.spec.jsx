import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'

const mockFetchDocument = jest.fn()

let mockStoreState = {}

jest.mock('../../stores/document-detail-store.js', () => ({
  useDocumentDetailStore: jest.fn(selector => selector(mockStoreState)),
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'documents.backToDocuments': 'Back to Documents',
        'documents.exportPdf': 'Export PDF',
        'documents.created': 'Created',
      }
      return translations[key] || key
    },
  }),
}))

const mockUseParams = jest.fn(() => ({ id: 'doc-123' }))

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useParams: () => mockUseParams(),
}))

let capturedOnLoadSuccess = null

jest.mock('react-pdf', () => ({
  Document: ({ children, file, onLoadSuccess, ...props }) => {
    capturedOnLoadSuccess = onLoadSuccess
    return (
      <div data-testid="pdf-document" data-file={file} {...props}>
        {children}
      </div>
    )
  },
  Page: ({ pageNumber, width, renderAnnotationLayer: _ral, renderTextLayer: _rtl, ...props }) => (
    <div data-testid={`pdf-page-${pageNumber}`} data-width={String(width)} {...props} />
  ),
}))

jest.mock('date-fns', () => ({
  format: () => 'Mar 25, 2026',
}))

jest.mock('lucide-react', () => ({
  ArrowLeft: props => <svg data-testid="arrow-left-icon" {...props} />,
  Download: props => <svg data-testid="download-icon" {...props} />,
}))

jest.mock('@/shadcn/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}))

jest.mock('./document-detail-skeleton.jsx', () => {
  return function MockDocumentDetailSkeleton() {
    return <div data-testid="document-detail-skeleton" />
  }
})

jest.mock('../../config/index.js', () => ({
  __esModule: true,
  default: { apiBaseUrl: 'http://localhost:8000/api' },
}))

import DocumentDetail from './document-detail'

const mockDocument = {
  id: 'doc-123',
  title: 'Non-Disclosure Agreement',
  type: 'Contract',
  createdAt: '2026-03-25T10:00:00Z',
}

function buildStoreState(overrides = {}) {
  return {
    documents: { 'doc-123': mockDocument },
    loading: false,
    fetchDocument: mockFetchDocument,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  capturedOnLoadSuccess = null
  mockStoreState = buildStoreState()
  mockUseParams.mockReturnValue({ id: 'doc-123' })
})

describe('DocumentDetail', () => {
  it('renders action bar with back link and export button, and document header with title, type badge, and date', () => {
    render(<DocumentDetail />)

    const backLink = screen.getByTestId('back-link')
    expect(backLink).toHaveTextContent('Back to Documents')
    expect(backLink).toHaveAttribute('href', '/')

    const exportBtn = screen.getByTestId('export-pdf-button')
    expect(exportBtn).toHaveTextContent('Export PDF')

    const header = screen.getByTestId('detail-header')
    expect(header).toHaveTextContent('Non-Disclosure Agreement')
    expect(header).toHaveTextContent('Contract')
    expect(header).toHaveTextContent('Created Mar 25, 2026')
  })

  it('calls fetchDocument with the route param id on mount', () => {
    render(<DocumentDetail />)
    expect(mockFetchDocument).toHaveBeenCalledWith('doc-123')
  })

  it('renders the PDF Document component with the correct file URL', () => {
    render(<DocumentDetail />)
    const pdfDoc = screen.getByTestId('pdf-document')
    expect(pdfDoc).toHaveAttribute('data-file', 'http://localhost:8000/api/v1/documents/doc-123/pdf')
  })

  it('shows loading skeleton when loading is true', () => {
    mockStoreState = buildStoreState({ loading: true, documents: {} })
    render(<DocumentDetail />)
    expect(screen.getByTestId('document-detail-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('detail-header')).not.toBeInTheDocument()
    expect(screen.queryByTestId('export-pdf-button')).not.toBeInTheDocument()
  })

  it('shows loading skeleton when document is not yet in store', () => {
    mockStoreState = buildStoreState({ documents: {} })
    render(<DocumentDetail />)
    expect(screen.getByTestId('document-detail-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('export-pdf-button')).not.toBeInTheDocument()
  })

  it('triggers a browser download when export PDF button is clicked', () => {
    const mockClick = jest.fn()
    const originalCreateElement = window.document.createElement.bind(window.document)
    const mockCreateElement = jest.spyOn(window.document, 'createElement').mockImplementation(tag => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        el.click = mockClick
      }
      return el
    })

    render(<DocumentDetail />)
    fireEvent.click(screen.getByTestId('export-pdf-button'))

    expect(mockClick).toHaveBeenCalled()

    mockCreateElement.mockRestore()
  })

  it('renders PDF pages with default width of 720', () => {
    render(<DocumentDetail />)

    act(() => {
      capturedOnLoadSuccess({ numPages: 1 })
    })

    expect(screen.getByTestId('pdf-page-1')).toHaveAttribute('data-width', '720')
  })

  it('updates page width when ResizeObserver fires', () => {
    let resizeCallback
    const mockDisconnect = jest.fn()
    const MockResizeObserver = jest.fn(cb => {
      resizeCallback = cb
      return { observe: jest.fn(), disconnect: mockDisconnect }
    })
    const original = window.ResizeObserver
    window.ResizeObserver = MockResizeObserver

    render(<DocumentDetail />)

    act(() => {
      capturedOnLoadSuccess({ numPages: 1 })
    })

    act(() => {
      resizeCallback([{ contentBoxSize: [{ inlineSize: 500 }] }])
    })

    expect(screen.getByTestId('pdf-page-1')).toHaveAttribute('data-width', '500')

    window.ResizeObserver = original
  })

  it('disconnects ResizeObserver on unmount', () => {
    const mockDisconnect = jest.fn()
    const MockResizeObserver = jest.fn(() => ({
      observe: jest.fn(),
      disconnect: mockDisconnect,
    }))
    const original = window.ResizeObserver
    window.ResizeObserver = MockResizeObserver

    const { unmount } = render(<DocumentDetail />)
    unmount()

    expect(mockDisconnect).toHaveBeenCalled()

    window.ResizeObserver = original
  })

  it('renders PDF pages after onLoadSuccess reports the page count', () => {
    render(<DocumentDetail />)

    expect(screen.queryByTestId('pdf-page-1')).not.toBeInTheDocument()

    act(() => {
      capturedOnLoadSuccess({ numPages: 3 })
    })

    expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-page-2')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-page-3')).toBeInTheDocument()
  })
})
