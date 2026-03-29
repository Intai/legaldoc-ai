import React from 'react'
import { render, screen } from '@testing-library/react'

const mockUploadReference = jest.fn()
let mockIsDragActive = false

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => key,
  }),
}))

jest.mock('lucide-react', () => ({
  Upload: props => <svg data-testid={props['data-testid']} />,
}))

jest.mock('../../stores/new-document-store.js', () => ({
  useNewDocumentStore: selector =>
    selector({ uploadReference: mockUploadReference }),
}))

let capturedOptions = {}

jest.mock('react-dropzone', () => ({
  useDropzone: options => {
    capturedOptions = options
    return {
      getRootProps: () => ({ 'data-testid': 'upload-area' }),
      getInputProps: () => ({
        'data-testid': 'upload-input',
        type: 'file',
        accept: 'application/pdf,.pdf,text/plain,.txt',
      }),
      isDragActive: mockIsDragActive,
    }
  },
}))

import UploadArea from './upload-area'

function createFile(name, type) {
  return new File(['content'], name, { type })
}

describe('UploadArea', () => {
  beforeEach(() => {
    mockUploadReference.mockClear()
    mockIsDragActive = false
  })

  it('renders upload icon, title, and hint text', () => {
    render(<UploadArea />)
    expect(screen.getByTestId('upload-icon')).toBeInTheDocument()
    expect(screen.getByTestId('upload-title')).toHaveTextContent('newDocument.uploadTitle')
    expect(screen.getByTestId('upload-hint')).toHaveTextContent('newDocument.uploadHint')
  })

  it('renders a file input via getInputProps', () => {
    render(<UploadArea />)
    const input = screen.getByTestId('upload-input')
    expect(input).toBeInTheDocument()
    expect(input.getAttribute('type')).toBe('file')
  })

  it('configures useDropzone with correct accept types', () => {
    render(<UploadArea />)
    expect(capturedOptions.accept).toEqual({
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    })
  })

  it('shows default styles and hint text when not dragging', () => {
    render(<UploadArea />)
    const area = screen.getByTestId('upload-area')
    expect(area.className).toContain('border-neutral-300')
    expect(screen.getByTestId('upload-hint')).toHaveTextContent('newDocument.uploadHint')
  })

  it('applies drag-over styles and shows drag-active text when isDragActive is true', () => {
    mockIsDragActive = true
    render(<UploadArea />)
    const area = screen.getByTestId('upload-area')
    expect(area.className).toContain('border-primary-400')
    expect(area.className).toContain('bg-primary-50')
    expect(area.className).not.toContain('border-neutral-300')
    expect(screen.getByTestId('upload-hint')).toHaveTextContent('newDocument.uploadDragActive')
  })

  it('calls uploadReference for each accepted file via onDrop callback', () => {
    render(<UploadArea />)
    const file1 = createFile('doc1.pdf', 'application/pdf')
    const file2 = createFile('doc2.txt', 'text/plain')

    capturedOptions.onDrop([file1, file2])

    expect(mockUploadReference).toHaveBeenCalledTimes(2)
    expect(mockUploadReference).toHaveBeenCalledWith(file1)
    expect(mockUploadReference).toHaveBeenCalledWith(file2)
  })
})
