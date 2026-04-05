import { render, screen } from '@testing-library/react'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const translations = {
        'assistant.noResults': 'No relevant results found. Try rephrasing your question.',
      }
      return translations[key] || key
    },
  }),
}))

import { AssistantPanelEmpty } from './assistant-panel-empty'

describe('AssistantPanelEmpty', () => {
  it('renders the no results message', () => {
    render(<AssistantPanelEmpty />)

    expect(screen.getByTestId('assistant-panel-empty')).toBeInTheDocument()
    expect(
      screen.getByText('No relevant results found. Try rephrasing your question.'),
    ).toBeInTheDocument()
  })
})
