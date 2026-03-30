import React, { lazy, Suspense } from 'react'
import { pdfjs } from 'react-pdf'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import '../i18n'
import AppShell from './app-shell'
import { GlobalDialog } from './global-dialog'

// Worker version must match react-pdf's bundled pdfjs-dist version.
// Copied from node_modules/react-pdf/node_modules/pdfjs-dist/build/.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const DocumentsPage = lazy(() => import('../documents/components/documents-page'))
const NewDocumentPage = lazy(() => import('../documents/components/new-document-page'))
const DocumentDetail = lazy(() => import('../documents/components/document-detail'))

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route
            path="/"
            element={
              <Suspense fallback={null}>
                <DocumentsPage />
              </Suspense>
            }
          />
          <Route
            path="/documents/new"
            element={
              <Suspense fallback={null}>
                <NewDocumentPage />
              </Suspense>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <Suspense fallback={null}>
                <DocumentDetail />
              </Suspense>
            }
          />
        </Routes>
      </AppShell>
      <GlobalDialog />
    </BrowserRouter>
  )
}

export default App
