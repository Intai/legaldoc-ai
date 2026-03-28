import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Button } from '@/shadcn/ui/button'

function EmptyState({ isFiltered }) {
  const { t } = useTranslation()

  return (
    <div
      className="flex flex-1 items-start justify-center"
      data-testid="empty-state"
    >
      <div className="flex flex-col items-center text-center max-w-[400px] p-8">
        <FileText
          className="size-12 text-neutral-300 mb-4"
          strokeWidth={1.5}
          data-testid="empty-state-icon"
        />
        <p className="text-base font-semibold text-neutral-700 leading-snug mb-2">
          {isFiltered ? t('documents.emptyFilterTitle') : t('documents.emptyTitle')}
        </p>
        <p className="text-sm text-neutral-500 leading-normal mb-6">
          {isFiltered
            ? t('documents.emptyFilterDescription')
            : t('documents.emptyDescription')}
        </p>
        {!isFiltered && (
          <Link to="/documents/new">
            <Button>{t('documents.emptyNewDocument')}</Button>
          </Link>
        )}
      </div>
    </div>
  )
}

export default EmptyState
