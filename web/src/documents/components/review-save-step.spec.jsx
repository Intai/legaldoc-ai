import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PHASE_DRAFTING } from '../../constants.js'

const mockGoToStep = jest.fn()
const mockSaveDocument = jest.fn(() => Promise.resolve(true))
const mockDownloadFile = jest.fn()
const mockNavigateTo = jest.fn()

let mockStoreState = {}

let mockResizeCallback = null
const mockDisconnect = jest.fn()

class MockResizeObserver {
  constructor(callback) {
    mockResizeCallback = callback
    this.observe = jest.fn()
    this.disconnect = mockDisconnect
  }
}

beforeAll(() => {
  global.ResizeObserver = MockResizeObserver
})

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'newDocument.backButton': 'Back',
        'newDocument.saveButton': 'Save Document',
        'newDocument.exportButton': 'Export PDF',
      }
      return translations[key] || key
    },
  }),
}))

let capturedOnLoadSuccess = null

jest.mock('react-pdf', () => ({
  Document: ({ children, file, onLoadSuccess }) => {
    capturedOnLoadSuccess = onLoadSuccess
    return (
      <div data-testid="pdf-document" data-file={file}>
        {children}
      </div>
    )
  },
  Page: ({ pageNumber, width }) => (
    <div data-testid={`pdf-page-${pageNumber}`} data-width={width} />
  ),
}))

jest.mock('lucide-react', () => ({
  ArrowLeft: props => <svg data-testid="icon-arrow-left" {...props} />,
  Download: props => <svg data-testid="icon-download" {...props} />,
  Save: props => <svg data-testid="icon-save" {...props} />,
  Check: props => <svg data-testid="icon-check" {...props} />,
  Circle: props => <svg data-testid="icon-circle" {...props} />,
  Loader2: props => <svg data-testid="icon-loader" {...props} />,
}))

jest.mock('../../config/index.js', () => ({
  __esModule: true,
  default: { apiBaseUrl: 'http://localhost:8000/api' },
}))

const mockClearDocuments = jest.fn()

jest.mock('../../stores/documents-store.js', () => ({
  useDocumentsStore: selector => selector({ clear: mockClearDocuments }),
}))

jest.mock('../../stores/new-document-store.js', () => ({
  useNewDocumentStore: selector => selector(mockStoreState),
}))

jest.mock('../../utils/browser.js', () => ({
  downloadFile: (...args) => mockDownloadFile(...args),
  navigateTo: (...args) => mockNavigateTo(...args),
}))

import ReviewSaveStep from './review-save-step'

describe('ReviewSaveStep', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStoreState = {
      generationPhase: 'complete',
      generatedDocumentId: 'doc-123',
      saving: false,
      goToStep: mockGoToStep,
      saveDocument: mockSaveDocument,
    }
  })

  it('renders phase progress, PDF viewer, and footer buttons when generation is complete', () => {
    render(<ReviewSaveStep />)
    expect(screen.getByTestId('phase-progress')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-document')).toHaveAttribute(
      'data-file',
      'http://localhost:8000/api/v1/documents/doc-123/pdf',
    )
    expect(screen.getByTestId('back-button')).toBeInTheDocument()
    expect(screen.getByTestId('save-button')).toBeInTheDocument()
    expect(screen.getByTestId('export-pdf-button')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.getByText('Save Document')).toBeInTheDocument()
    expect(screen.getByText('Export PDF')).toBeInTheDocument()
  })

  it('clears documents store when generatedDocumentId is truthy', () => {
    render(<ReviewSaveStep />)
    expect(mockClearDocuments).toHaveBeenCalledTimes(1)
  })

  it('does not clear documents store when generatedDocumentId is null', () => {
    mockStoreState.generatedDocumentId = null
    render(<ReviewSaveStep />)
    expect(mockClearDocuments).not.toHaveBeenCalled()
  })

  it('does not render PDF viewer when generatedDocumentId is null', () => {
    mockStoreState.generatedDocumentId = null
    render(<ReviewSaveStep />)
    expect(screen.queryByTestId('doc-viewer-wrap')).not.toBeInTheDocument()
    expect(screen.getByTestId('phase-progress')).toBeInTheDocument()
  })

  it('disables Save and Export PDF buttons when generation is not complete', () => {
    mockStoreState.generationPhase = PHASE_DRAFTING
    render(<ReviewSaveStep />)
    expect(screen.getByTestId('save-button')).toBeDisabled()
    expect(screen.getByTestId('export-pdf-button')).toBeDisabled()
  })

  it('disables Save button when saving is in progress', () => {
    mockStoreState.saving = true
    render(<ReviewSaveStep />)
    expect(screen.getByTestId('save-button')).toBeDisabled()
  })

  it('navigates to step 2 when Back button is clicked', () => {
    render(<ReviewSaveStep />)
    fireEvent.click(screen.getByTestId('back-button'))
    expect(mockGoToStep).toHaveBeenCalledWith(2)
  })

  it('calls saveDocument and navigates on success when Save button is clicked', async () => {
    mockSaveDocument.mockResolvedValue(true)
    render(<ReviewSaveStep />)
    fireEvent.click(screen.getByTestId('save-button'))
    await waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith('/documents/doc-123')
    })
    expect(mockSaveDocument).toHaveBeenCalledTimes(1)
  })

  it('does not navigate when saveDocument fails', async () => {
    mockSaveDocument.mockResolvedValue(false)
    render(<ReviewSaveStep />)
    fireEvent.click(screen.getByTestId('save-button'))
    await waitFor(() => {
      expect(mockSaveDocument).toHaveBeenCalledTimes(1)
    })
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('calls downloadFile with the PDF URL when Export PDF button is clicked', () => {
    render(<ReviewSaveStep />)
    fireEvent.click(screen.getByTestId('export-pdf-button'))
    expect(mockDownloadFile).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/documents/doc-123/pdf',
    )
  })

  it('renders PDF pages when onLoadSuccess reports page count', () => {
    render(<ReviewSaveStep />)
    act(() => {
      capturedOnLoadSuccess({ numPages: 3 })
    })
    expect(screen.getByTestId('pdf-page-1')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-page-2')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-page-3')).toBeInTheDocument()
  })

  it('updates page width when ResizeObserver fires and cleans up on unmount', () => {
    const { unmount } = render(<ReviewSaveStep />)
    act(() => {
      capturedOnLoadSuccess({ numPages: 1 })
    })
    act(() => {
      mockResizeCallback([{ contentBoxSize: [{ inlineSize: 600.7 }] }])
    })
    expect(screen.getByTestId('pdf-page-1')).toHaveAttribute('data-width', '600')
    unmount()
    expect(mockDisconnect).toHaveBeenCalled()
  })
})
