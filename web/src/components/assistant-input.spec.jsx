import { fireEvent, render, screen } from '@testing-library/react'

const mockSetQuery = jest.fn()
const mockSubmitQuery = jest.fn()
const mockFocusQuery = jest.fn()
const mockClose = jest.fn()

let mockStoreState = {}

jest.mock('../stores/assistant-store', () => ({
  useAssistantStore: () => ({
    query: '',
    editing: false,
    open: false,
    setQuery: mockSetQuery,
    submitQuery: mockSubmitQuery,
    focusQuery: mockFocusQuery,
    close: mockClose,
    ...mockStoreState,
  }),
}))

jest.mock('./assistant-panel', () => ({
  AssistantPanel: () => <div data-testid="assistant-panel" />,
}))

let mockCapturedPopoverProps = {}
let mockCapturedContentProps = {}

jest.mock('@/shadcn/ui/popover', () => ({
  Popover: ({ children, ...props }) => {
    mockCapturedPopoverProps = props
    return <div data-testid="popover-root">{children}</div>
  },
  PopoverAnchor: ({ children }) => <div>{children}</div>,
  PopoverContent: ({ children, ...props }) => {
    mockCapturedContentProps = props
    return <div data-testid="popover-content">{children}</div>
  },
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'assistant.placeholder': 'Ask about your documents...',
      }
      return translations[key] || key
    },
  }),
  Trans: ({ i18nKey, children }) => <span>{children || i18nKey}</span>,
}))

jest.mock('lucide-react', () => ({
  Loader2: props => <svg data-testid="icon-loader" {...props} />,
  Search: props => <svg data-testid="icon-search" {...props} />,
}))

jest.mock('@/shadcn/ui/input', () => ({
  Input: props => <input {...props} />,
}))

import { AssistantInput } from './assistant-input'

beforeEach(() => {
  mockStoreState = {}
  mockCapturedPopoverProps = {}
  mockCapturedContentProps = {}
  mockSetQuery.mockClear()
  mockSubmitQuery.mockClear()
  mockFocusQuery.mockClear()
  mockClose.mockClear()
})

describe('AssistantInput', () => {
  it('renders search icon in the input wrapper', () => {
    render(<AssistantInput />)
    expect(screen.getByTestId('icon-search')).toBeInTheDocument()
  })

  it('renders loader icon when loading', () => {
    mockStoreState = { loading: true }
    render(<AssistantInput />)
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
    expect(screen.queryByTestId('icon-search')).not.toBeInTheDocument()
  })

  it('calls setQuery when typing in the input', () => {
    render(<AssistantInput />)
    fireEvent.change(screen.getByTestId('assistant-input'), { target: { value: 'test query' } })
    expect(mockSetQuery).toHaveBeenCalledWith('test query')
  })

  it('calls submitQuery when Enter is pressed', () => {
    render(<AssistantInput />)
    fireEvent.keyDown(screen.getByTestId('assistant-input'), { key: 'Enter' })
    expect(mockSubmitQuery).toHaveBeenCalled()
  })

  it('does not call submitQuery for non-Enter keys', () => {
    render(<AssistantInput />)
    fireEvent.keyDown(screen.getByTestId('assistant-input'), { key: 'a' })
    expect(mockSubmitQuery).not.toHaveBeenCalled()
  })

  it('calls focusQuery when input is focused', () => {
    render(<AssistantInput />)
    fireEvent.focus(screen.getByTestId('assistant-input'))
    expect(mockFocusQuery).toHaveBeenCalled()
  })

  it('renders the AssistantPanel below the input', () => {
    render(<AssistantInput />)
    expect(screen.getByTestId('assistant-panel')).toBeInTheDocument()
  })

  it('shows enter hint when editing and panel is closed', () => {
    mockStoreState = { query: 'test', editing: true, open: false }
    render(<AssistantInput />)
    expect(screen.getByTestId('assistant-enter-hint')).toBeInTheDocument()
  })

  it('hides enter hint when not editing', () => {
    mockStoreState = { editing: false, open: false }
    render(<AssistantInput />)
    expect(screen.queryByTestId('assistant-enter-hint')).not.toBeInTheDocument()
  })

  it('hides enter hint when panel is open', () => {
    mockStoreState = { editing: true, open: true }
    render(<AssistantInput />)
    expect(screen.queryByTestId('assistant-enter-hint')).not.toBeInTheDocument()
  })

  it('passes open state to Popover', () => {
    mockStoreState = { open: true }
    render(<AssistantInput />)
    expect(mockCapturedPopoverProps.open).toBe(true)
  })

  it('calls close when onOpenChange receives false', () => {
    mockStoreState = { open: true }
    render(<AssistantInput />)
    mockCapturedPopoverProps.onOpenChange(false)
    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('does not call close when onOpenChange receives true', () => {
    render(<AssistantInput />)
    mockCapturedPopoverProps.onOpenChange(true)
    expect(mockClose).not.toHaveBeenCalled()
  })

  it('prevents closing when interacting with the anchor', () => {
    render(<AssistantInput />)
    const input = screen.getByTestId('assistant-input')
    const preventDefault = jest.fn()

    mockCapturedContentProps.onInteractOutside({ target: input, preventDefault })

    expect(preventDefault).toHaveBeenCalled()
  })

  it('does not prevent closing when interacting outside the anchor', () => {
    render(
      <div data-testid="outside">
        <AssistantInput />
      </div>,
    )
    const outside = screen.getByTestId('outside')
    const preventDefault = jest.fn()

    mockCapturedContentProps.onInteractOutside({ target: outside, preventDefault })

    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('prevents auto-focus on popover open and close', () => {
    render(<AssistantInput />)
    const preventDefault = jest.fn()
    mockCapturedContentProps.onOpenAutoFocus({ preventDefault })
    expect(preventDefault).toHaveBeenCalled()
  })
})
