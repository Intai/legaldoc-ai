import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Document, Page } from 'react-pdf'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/shadcn/ui/button'
import config from '../../config/index.js'
import { useDocumentDetailStore } from '../../stores/document-detail-store.js'
import { downloadFile } from '../../utils/browser.js'
import DocumentDetailSkeleton from './document-detail-skeleton.jsx'

function DocumentDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const document = useDocumentDetailStore(state => state.documents[id])
  const loading = useDocumentDetailStore(state => state.loading)
  const fetchDocument = useDocumentDetailStore(state => state.fetchDocument)
  const [numPages, setNumPages] = useState(0)
  const [pageWidth, setPageWidth] = useState(720)
  const containerRef = useRef(null)
  const isLoading = loading || !document

  useEffect(() => {
    fetchDocument(id)
  }, [fetchDocument, id])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setPageWidth(Math.floor(entry.contentBoxSize[0].inlineSize))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [isLoading])

  const onLoadSuccess = useCallback(({ numPages: total }) => {
    setNumPages(total)
  }, [])

  const pdfUrl = `${config.apiBaseUrl}/v1/documents/${id}/pdf`

  const handleExportPdf = useCallback(() => {
    downloadFile(pdfUrl)
  }, [pdfUrl])

  return (
    <div>
      <div
        className="sticky top-0 z-10 h-14 flex items-center justify-between px-5 max-md:py-3 bg-card border-b border-border"
        data-testid="action-bar"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 no-underline rounded-md px-2 py-1 transition-colors hover:text-neutral-800 hover:bg-neutral-50"
          data-testid="back-link"
        >
          <ArrowLeft className="size-4 shrink-0" />
          {t('documents.backToDocuments')}
        </Link>
        {!isLoading && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            data-testid="export-pdf-button"
          >
            <Download className="size-4 shrink-0" />
            {t('documents.exportButton')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <DocumentDetailSkeleton />
      ) : (
        <>
          <div className="px-6 pt-6 max-md:px-4 max-md:pt-4" data-testid="detail-header">
            <h1 className="text-3xl font-semibold text-neutral-900 leading-tight tracking-tight max-md:text-2xl">
              {document.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-neutral-500">
              <span className="inline-flex items-center rounded-sm bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                {document.type}
              </span>
              <span>
                {t('documents.created')} {format(new Date(document.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="p-6 max-md:px-4" data-testid="doc-viewer-wrap">
            <div ref={containerRef} className="max-w-[720px] mx-auto bg-card border border-border rounded-lg shadow-md" data-testid="pdf-container">
              <Document
                file={pdfUrl}
                onLoadSuccess={onLoadSuccess}
              >
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
        </>
      )}
    </div>
  )
}

export default DocumentDetail
