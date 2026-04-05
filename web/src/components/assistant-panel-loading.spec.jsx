import { render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'assistant.thinking': 'Thinking...',
      }
      return translations[key] || key
    },
  }),
}))

jest.mock('@/shadcn/ui/skeleton', () => ({
  Skeleton: props => <div data-testid="skeleton" {...props} />,
}))

import { AssistantPanelLoading } from './assistant-panel-loading'

describe('AssistantPanelLoading', () => {
  it('renders the thinking message', () => {
    render(<AssistantPanelLoading />)

    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('renders skeleton lines for answer placeholder', () => {
    render(<AssistantPanelLoading />)

    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  it('renders skeleton placeholders for source cards', () => {
    render(<AssistantPanelLoading />)

    const skeletons = screen.getAllByTestId('skeleton')
    // 3 answer lines + 1 label + 2 source cards = 6
    expect(skeletons).toHaveLength(6)
  })

  it('has the loading test id', () => {
    render(<AssistantPanelLoading />)

    expect(screen.getByTestId('assistant-panel-loading')).toBeInTheDocument()
  })
})
