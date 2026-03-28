import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import '../i18n'
import AppShell from './app-shell'
import { GlobalDialog } from './global-dialog'

const DocumentsPage = lazy(() => import('../documents/components/documents-page'))

function DocumentDetail() {
  return <div>Document Detail</div>
}

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
          <Route path="/documents/:id" element={<DocumentDetail />} />
        </Routes>
      </AppShell>
      <GlobalDialog />
    </BrowserRouter>
  )
}

export default App
