import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('../i18n', () => {})
jest.mock('./app-shell', () => {
  return function MockAppShell({ children }) {
    return <div>{children}</div>
  }
})
jest.mock('./global-dialog', () => ({
  GlobalDialog: function MockGlobalDialog() {
    return null
  },
}))
jest.mock('../documents/components/documents-page', () => {
  return function MockDocumentsPage() {
    return <div>Documents Page</div>
  }
})

import App from './app'

describe('App', () => {
  it('renders without crashing and displays the documents page at root route', async () => {
    render(<App />)
    expect(await screen.findByText('Documents Page')).toBeInTheDocument()
  })

  it('renders document detail route', () => {
    window.history.pushState({}, '', '/documents/123')
    render(<App />)
    expect(screen.getByText('Document Detail')).toBeInTheDocument()
  })
})
