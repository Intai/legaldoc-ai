import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/shadcn/ui/card'

const STATUS_CLASSES = {
  Done: 'bg-success-100 text-success-700',
  Draft: 'bg-warning-100 text-warning-700',
  Generating: 'bg-primary-100 text-primary-700',
}

const STATUS_KEYS = {
  Done: 'documents.statusDone',
  Draft: 'documents.statusDraft',
  Generating: 'documents.statusGenerating',
}

/**
 * Formats a document date for display.
 * Shows relative time (e.g. "3 days ago") for dates within 7 days,
 * otherwise shows absolute date (e.g. "Mar 25, 2026").
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date string
 */
function formatDocumentDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  if (diffMs < sevenDays) {
    return formatDistanceToNow(date, { addSuffix: true })
  }
  return format(date, 'MMM d, yyyy')
}

function DocumentCard({ document }) {
  const { t } = useTranslation()
  const statusClass = STATUS_CLASSES[document.status] || ''
  const statusKey = STATUS_KEYS[document.status] || document.status

  return (
    <Link
      to={`/documents/${document.id}`}
      className="no-underline text-inherit"
      data-testid={`document-card-${document.id}`}
    >
      <Card className="p-5 gap-2 cursor-pointer transition-all hover:shadow-md hover:border-border-strong">
        <CardHeader className="flex flex-row items-start justify-between gap-3 p-0">
          <span className="text-base font-semibold text-neutral-900 leading-snug">
            {document.title}
          </span>
          <span
            className={`inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 text-xs font-medium ${statusClass}`}
            data-testid={`status-badge-${document.id}`}
          >
            {t(statusKey)}
          </span>
        </CardHeader>
        <CardContent className="p-0 mt-0">
          <p className="text-sm text-neutral-500 leading-normal line-clamp-2 mb-4">
            {document.description}
          </p>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span
              className="inline-flex items-center rounded-sm bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
              data-testid={`type-badge-${document.id}`}
            >
              {document.type}
            </span>
            <span className="text-neutral-200">&middot;</span>
            <span>{formatDocumentDate(document.createdAt)}</span>
            {document.pageCount != null && (
              <>
                <span className="text-neutral-200">&middot;</span>
                <span>{t('documents.pages', { count: document.pageCount })}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default DocumentCard
