import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shadcn/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shadcn/ui/select'
import { useDocumentsStore } from '../../stores/documents-store.js'
import DocumentCard from './document-card.jsx'
import EmptyState from './empty-state.jsx'
import SkeletonGrid from './skeleton-grid.jsx'

const TYPE_FILTERS = [
  { value: 'all', labelKey: 'documents.filterAllTypes' },
  { value: 'Contract', labelKey: 'documents.filterContract' },
  { value: 'Policy', labelKey: 'documents.filterPolicy' },
  { value: 'Employment', labelKey: 'documents.filterEmployment' },
  { value: 'NDA', labelKey: 'documents.filterNda' },
]

const SORT_OPTIONS = [
  { value: 'recent', labelKey: 'documents.sortMostRecent' },
  { value: 'alpha', labelKey: 'documents.sortAlphabetical' },
]

function DocumentsPage() {
  const { t } = useTranslation()
  const documents = useDocumentsStore(state => state.documents)
  const sort = useDocumentsStore(state => state.sort)
  const typeFilter = useDocumentsStore(state => state.typeFilter)
  const loading = useDocumentsStore(state => state.loading)
  const loadingMore = useDocumentsStore(state => state.loadingMore)
  const nextCursor = useDocumentsStore(state => state.nextCursor)
  const fetchDocuments = useDocumentsStore(state => state.fetchDocuments)
  const fetchMore = useDocumentsStore(state => state.fetchMore)
  const setSort = useDocumentsStore(state => state.setSort)
  const setTypeFilter = useDocumentsStore(state => state.setTypeFilter)
  const hasMore = nextCursor != null
  const isFiltered = typeFilter !== 'all'

  useEffect(() => {
    if (documents.length <= 0) {
      fetchDocuments()
    }
  }, [])

  return (
    <div className="p-6 max-md:p-4">
      <h1
        className="text-3xl font-semibold text-neutral-900 leading-tight tracking-tight"
        data-testid="page-title"
      >
        {t('documents.title')}
      </h1>

      <div className="flex items-center gap-3 mt-4 mb-6" data-testid="controls-row">
        <Select value={sort} onValueChange={setSort} disabled={loading}>
          <SelectTrigger data-testid="sort-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter} disabled={loading}>
          <SelectTrigger data-testid="type-filter-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : documents.length === 0 ? (
        <EmptyState isFiltered={isFiltered} />
      ) : (
        <>
          <div
            className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]"
            data-testid="card-grid"
          >
            {documents.map(doc => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={fetchMore}
                disabled={loadingMore}
                data-testid="load-more-button"
              >
                {loadingMore ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t('documents.loadMore')
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DocumentsPage
