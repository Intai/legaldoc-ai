import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

let mockStore

jest.mock('@/stores/assistant-store', () => {
  const useAssistantStore = selector => selector(mockStore)
  return { useAssistantStore }
})

jest.mock('@/shadcn/ui/popover', () => ({
  Popover: ({ children }) => <div>{children}</div>,
  PopoverAnchor: ({ children }) => <div>{children}</div>,
  PopoverContent: ({ children }) => <div>{children}</div>,
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'assistant.sources': 'Sources',
      }
      return translations[key] || key
    },
  }),
  Trans: ({ i18nKey, children }) => <span>{children || i18nKey}</span>,
}))

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

jest.mock('lucide-react', () => ({
  FileText: props => <svg data-testid="icon-file-text" {...props} />,
}))

jest.mock('./assistant-panel-loading', () => ({
  AssistantPanelLoading: () => <div data-testid="assistant-panel-loading" />,
}))

jest.mock('./assistant-panel-empty', () => ({
  AssistantPanelEmpty: () => <div data-testid="assistant-panel-empty" />,
}))

import { AssistantPanel } from './assistant-panel'

beforeEach(() => {
  mockStore = {
    loading: false,
    answer: '',
    sources: [],
    close: jest.fn(),
  }
})

describe('AssistantPanel', () => {
  it('renders the panel', () => {
    render(<AssistantPanel />)

    expect(screen.getByTestId('assistant-panel')).toBeInTheDocument()
  })

  it('shows loading state when loading with no answer', () => {
    mockStore.loading = true

    render(<AssistantPanel />)

    expect(screen.getByTestId('assistant-panel-loading')).toBeInTheDocument()
  })

  it('shows empty state when not loading and no results', () => {
    render(<AssistantPanel />)

    expect(screen.getByTestId('assistant-panel-empty')).toBeInTheDocument()
  })

  it('renders streamed answer text', () => {
    mockStore.answer = 'An NDA should include confidentiality clauses.'

    render(<AssistantPanel />)

    expect(screen.getByTestId('assistant-answer')).toHaveTextContent(
      'An NDA should include confidentiality clauses.',
    )
  })

  it('renders source citations as links', () => {
    mockStore.answer = 'Some answer text'
    mockStore.sources = [
      { documentId: 'abc123', title: 'Standard NDA Template', snippet: 'receiving party shall hold...' },
      { documentId: 'def456', title: 'Confidentiality Agreement', snippet: 'obligations under this...' },
    ]

    render(<AssistantPanel />)

    const links = screen.getAllByTestId('assistant-source-link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/documents/abc123')
    expect(links[1]).toHaveAttribute('href', '/documents/def456')
    expect(screen.getByText('Standard NDA Template')).toBeInTheDocument()
    expect(screen.getByText('Confidentiality Agreement')).toBeInTheDocument()
  })

  it('calls close when clicking a source link', async () => {
    mockStore.answer = 'Some answer'
    mockStore.sources = [{ documentId: 'abc123', title: 'NDA Template' }]
    const user = userEvent.setup()

    render(<AssistantPanel />)

    const link = screen.getByTestId('assistant-source-link')
    expect(link).toHaveAttribute('href', '/documents/abc123')

    await user.click(link)

    expect(mockStore.close).toHaveBeenCalledTimes(1)
  })

  it('renders source snippets when present', () => {
    mockStore.answer = 'Answer text'
    mockStore.sources = [
      { documentId: 'abc', title: 'Doc', snippet: 'Some relevant snippet' },
    ]

    render(<AssistantPanel />)

    expect(screen.getByText('Some relevant snippet')).toBeInTheDocument()
  })

  it('renders source without snippet when snippet is absent', () => {
    mockStore.answer = 'Answer text'
    mockStore.sources = [{ documentId: 'abc', title: 'Doc Title' }]

    render(<AssistantPanel />)

    expect(screen.getByText('Doc Title')).toBeInTheDocument()
  })

  it('renders the Sources heading', () => {
    mockStore.answer = 'Answer'
    mockStore.sources = [{ documentId: '1', title: 'Doc' }]

    render(<AssistantPanel />)

    expect(screen.getByText('Sources')).toBeInTheDocument()
  })

  it('shows escape-to-close hint', () => {
    render(<AssistantPanel />)

    expect(screen.getByTestId('assistant-esc-hint')).toBeInTheDocument()
  })

  it('does not show loading when answer is already streaming', () => {
    mockStore.loading = true
    mockStore.answer = 'Partial answer...'

    render(<AssistantPanel />)

    expect(screen.queryByTestId('assistant-panel-loading')).not.toBeInTheDocument()
    expect(screen.getByTestId('assistant-answer')).toBeInTheDocument()
  })

  it('does not show empty state when loading', () => {
    mockStore.loading = true

    render(<AssistantPanel />)

    expect(screen.queryByTestId('assistant-panel-empty')).not.toBeInTheDocument()
  })

  it('renders document icons for each source', () => {
    mockStore.answer = 'Text'
    mockStore.sources = [
      { documentId: '1', title: 'Doc 1' },
      { documentId: '2', title: 'Doc 2' },
    ]

    render(<AssistantPanel />)

    const icons = screen.getAllByTestId('icon-file-text')
    expect(icons).toHaveLength(2)
  })
})
