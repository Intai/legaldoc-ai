import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('react-pdf', () => ({
  pdfjs: {
    GlobalWorkerOptions: { workerSrc: '' },
    version: '5.5.207',
  },
}))

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
jest.mock('../documents/components/document-detail', () => {
  return function MockDocumentDetail() {
    return <div>Document Detail</div>
  }
})

import App from './app'

describe('App', () => {
  it('renders without crashing and displays the documents page at root route', async () => {
    render(<App />)
    expect(await screen.findByText('Documents Page')).toBeInTheDocument()
  })

  it('renders document detail route', async () => {
    window.history.pushState({}, '', '/documents/123')
    render(<App />)
    expect(await screen.findByText('Document Detail')).toBeInTheDocument()
  })

  it('configures the PDF.js worker source', () => {
    const { pdfjs } = require('react-pdf')
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toContain('pdfjs-dist')
  })
})
