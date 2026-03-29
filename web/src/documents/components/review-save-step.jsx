import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Document, Page } from 'react-pdf'
import { ArrowLeft, Download, Save } from 'lucide-react'
import { Button } from '@/shadcn/ui/button'
import config from '../../config/index.js'
import { useNewDocumentStore } from '../../stores/new-document-store.js'
import { downloadFile, navigateTo } from '../../utils/browser.js'
import PhaseProgress from './phase-progress.jsx'

function ReviewSaveStep() {
  const { t } = useTranslation()
  const generationPhase = useNewDocumentStore(state => state.generationPhase)
  const generatedDocumentId = useNewDocumentStore(state => state.generatedDocumentId)
  const saving = useNewDocumentStore(state => state.saving)
  const goToStep = useNewDocumentStore(state => state.goToStep)
  const saveDocument = useNewDocumentStore(state => state.saveDocument)
  const [numPages, setNumPages] = useState(0)
  const [pageWidth, setPageWidth] = useState(720)
  const containerRef = useRef(null)

  const isComplete = generationPhase === 'complete'
  const pdfUrl = `${config.apiBaseUrl}/v1/documents/${generatedDocumentId}/pdf`

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setPageWidth(Math.floor(entry.contentBoxSize[0].inlineSize))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const onLoadSuccess = useCallback(({ numPages: total }) => {
    setNumPages(total)
  }, [])

  const handleBack = useCallback(() => {
    goToStep(2)
  }, [goToStep])

  const handleSave = useCallback(async () => {
    const success = await saveDocument()
    if (success) {
      navigateTo(`/documents/${generatedDocumentId}`)
    }
  }, [saveDocument, generatedDocumentId])

  const handleExportPdf = useCallback(() => {
    downloadFile(pdfUrl)
  }, [pdfUrl])

  return (
    <div className="flex min-h-0 flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 pt-0 max-md:px-4" data-testid="review-save-step">
        <PhaseProgress currentPhase={generationPhase} />

        {generatedDocumentId && (
          <div className="pt-6" data-testid="doc-viewer-wrap">
            <div
              ref={containerRef}
              className="max-w-[720px] mx-auto bg-card border border-border rounded-lg shadow-md"
              data-testid="pdf-container"
            >
              <Document file={pdfUrl} onLoadSuccess={onLoadSuccess}>
                {Array.from({ length: numPages }, (_, i) => (
                  <Page
                    key={`page_${i + 1}`}
                    pageNumber={i + 1}
                    width={pageWidth}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                ))}
              </Document>
            </div>
          </div>
        )}
      </div>

      <div
        className="flex items-center justify-between px-5 py-4 border-t border-border"
        data-testid="footer-bar"
      >
        <Button variant="secondary" onClick={handleBack} data-testid="back-button">
          <ArrowLeft className="size-4 shrink-0" />
          {t('newDocument.backButton')}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            disabled={!isComplete || saving}
            onClick={handleSave}
            data-testid="save-button"
          >
            <Save className="size-4 shrink-0" />
            {t('newDocument.saveButton')}
          </Button>

          <Button
            variant="outline"
            disabled={!isComplete}
            onClick={handleExportPdf}
            data-testid="export-pdf-button"
          >
            <Download className="size-4 shrink-0" />
            <span className="max-md:hidden">{t('newDocument.exportButton')}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ReviewSaveStep
