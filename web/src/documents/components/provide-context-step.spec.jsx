import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      const keys = {
        'newDocument.usingReferences': `Using ${opts?.count} reference:`,
        'newDocument.usingReferences_other': `Using ${opts?.count} references:`,
        'newDocument.contextLabel': 'Describe what you need',
        'newDocument.contextHelper': 'Include the parties, purpose, specific terms, and any questions you want addressed.',
        'newDocument.backButton': 'Back',
        'newDocument.generateButton': 'Generate Document',
      }
      return keys[key] ?? key
    },
  }),
}))

jest.mock('@/shadcn/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}))

jest.mock('@/shadcn/ui/textarea', () => ({
  Textarea: props => <textarea {...props} />,
}))

const mockState = {
  references: [
    { id: '1', title: 'NDA Template', type: 'Contract' },
    { id: '2', title: 'Service Agreement', type: 'Contract' },
    { id: '3', title: 'Privacy Policy', type: 'Policy' },
  ],
  selectedReferenceIds: new Set(['1', '2']),
  context: '',
  setContext: jest.fn(),
  goToStep: jest.fn(),
  generateDocument: jest.fn(),
}

jest.mock('@/stores/new-document-store', () => ({
  useNewDocumentStore: selector => selector(mockState),
  useSelectedReferences: () => {
    const { references, selectedReferenceIds } = mockState
    return references.filter(ref => selectedReferenceIds.has(ref.id))
  },
}))

import ProvideContextStep from './provide-context-step'

describe('ProvideContextStep', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockState.context = ''
  })

  it('renders references summary card with count, titles, and type badges', () => {
    render(<ProvideContextStep />)
    expect(screen.getByTestId('provide-context-step')).toBeInTheDocument()
    expect(screen.getByTestId('references-summary')).toBeInTheDocument()
    expect(screen.getByText(/Using 2 reference/)).toBeInTheDocument()
    expect(screen.getByTestId('summary-ref-1')).toHaveTextContent('NDA Template')
    expect(screen.getByTestId('summary-ref-1')).toHaveTextContent('Contract')
    expect(screen.getByTestId('summary-ref-2')).toHaveTextContent('Service Agreement')
    expect(screen.getByTestId('summary-ref-2')).toHaveTextContent('Contract')
    // Privacy Policy (id 3) is not selected and should not appear
    expect(screen.queryByTestId('summary-ref-3')).not.toBeInTheDocument()
  })

  it('renders context label, helper text, and textarea', () => {
    render(<ProvideContextStep />)
    expect(screen.getByText('Describe what you need')).toBeInTheDocument()
    expect(screen.getByText('Include the parties, purpose, specific terms, and any questions you want addressed.')).toBeInTheDocument()
    expect(screen.getByTestId('context-textarea')).toBeInTheDocument()
  })

  it('calls setContext when user types in the textarea', async () => {
    render(<ProvideContextStep />)
    await userEvent.type(screen.getByTestId('context-textarea'), 'A')
    expect(mockState.setContext).toHaveBeenCalledWith('A')
  })

  it('disables Generate Document button when context is empty', () => {
    render(<ProvideContextStep />)
    expect(screen.getByTestId('generate-button')).toBeDisabled()
  })

  it('enables Generate Document button when context has text', () => {
    mockState.context = 'Some context text'
    render(<ProvideContextStep />)
    expect(screen.getByTestId('generate-button')).not.toBeDisabled()
  })

  it('disables Generate Document button when context is only whitespace', () => {
    mockState.context = '   '
    render(<ProvideContextStep />)
    expect(screen.getByTestId('generate-button')).toBeDisabled()
  })

  it('calls goToStep(1) when Back button is clicked', async () => {
    render(<ProvideContextStep />)
    await userEvent.click(screen.getByTestId('back-button'))
    expect(mockState.goToStep).toHaveBeenCalledWith(1)
  })

  it('calls generateDocument when Generate Document button is clicked', async () => {
    mockState.context = 'Some context'
    render(<ProvideContextStep />)
    await userEvent.click(screen.getByTestId('generate-button'))
    expect(mockState.generateDocument).toHaveBeenCalledTimes(1)
  })

  it('renders commas between reference items except the last', () => {
    render(<ProvideContextStep />)
    const ref1 = screen.getByTestId('summary-ref-1')
    const ref2 = screen.getByTestId('summary-ref-2')
    expect(ref1.textContent).toContain(',')
    expect(ref2.textContent).not.toContain(',')
  })
})
