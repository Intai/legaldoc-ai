import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: {}, version: '0.0.0' },
}))

jest.mock('../i18n', () => {})

jest.mock('./app-shell', () => {
  return function MockAppShell({ children }) {
    return <div data-testid="app-shell">{children}</div>
  }
})

jest.mock('./global-dialog', () => ({
  GlobalDialog() {
    return <div data-testid="global-dialog" />
  },
}))

jest.mock('../documents/components/documents-page', () => {
  return function MockDocumentsPage() {
    return <div data-testid="documents-page" />
  }
})

jest.mock('../documents/components/new-document-page', () => {
  return function MockNewDocumentPage() {
    return <div data-testid="new-document-page" />
  }
})

jest.mock('../documents/components/document-detail', () => {
  return function MockDocumentDetail() {
    return <div data-testid="document-detail" />
  }
})

import App from './app'

describe('App', () => {
  it('renders documents page at the root route', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(await screen.findByTestId('documents-page')).toBeInTheDocument()
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('global-dialog')).toBeInTheDocument()
  })

  it('renders new document page at /documents/new', async () => {
    window.history.pushState({}, '', '/documents/new')
    render(<App />)
    expect(await screen.findByTestId('new-document-page')).toBeInTheDocument()
  })

  it('renders document detail at /documents/:id', async () => {
    window.history.pushState({}, '', '/documents/abc-123')
    render(<App />)
    expect(await screen.findByTestId('document-detail')).toBeInTheDocument()
  })
})
