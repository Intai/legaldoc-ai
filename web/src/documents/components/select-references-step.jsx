import React from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Button } from '@/shadcn/ui/button'
import { Input } from '@/shadcn/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shadcn/ui/select'
import { useFilteredReferences, useNewDocumentStore, useSelectedReferences } from '@/stores/new-document-store'
import ReferenceList from './reference-list'
import SelectedReferencesPanel from './selected-references-panel'
import UploadArea from './upload-area'

function SelectReferencesStep() {
  const { t } = useTranslation()
  const selectedReferenceIds = useNewDocumentStore(s => s.selectedReferenceIds)
  const searchQuery = useNewDocumentStore(s => s.searchQuery)
  const typeFilter = useNewDocumentStore(s => s.typeFilter)
  const setSearchQuery = useNewDocumentStore(s => s.setSearchQuery)
  const setTypeFilter = useNewDocumentStore(s => s.setTypeFilter)
  const toggleReference = useNewDocumentStore(s => s.toggleReference)
  const removeReference = useNewDocumentStore(s => s.removeReference)
  const goToStep = useNewDocumentStore(s => s.goToStep)

  const filtered = useFilteredReferences()
  const selectedRefs = useSelectedReferences()
  const selectedIds = [...selectedReferenceIds]
  const hasSelection = selectedReferenceIds.size > 0

  return (
    <div data-testid="select-references-step" className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-6 pt-0 max-md:px-4">
        {/* Upload area */}
        <UploadArea />

        {/* Filter row */}
        <div data-testid="filter-row" className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <Input
              data-testid="search-input"
              className="pl-9"
              placeholder={t('newDocument.searchReferences')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={setTypeFilter}
          >
            <SelectTrigger data-testid="type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('newDocument.filterAllTypes')}</SelectItem>
              <SelectItem value="Contract">{t('newDocument.filterContract')}</SelectItem>
              <SelectItem value="Policy">{t('newDocument.filterPolicy')}</SelectItem>
              <SelectItem value="Employment">{t('newDocument.filterEmployment')}</SelectItem>
              <SelectItem value="NDA">{t('newDocument.filterNda')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile selected summary */}
        <div
          data-testid="mobile-selected-summary"
          className="block md:hidden rounded-lg border border-border bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-700"
        >
          {t('newDocument.selectedSummary', { count: selectedReferenceIds.size })}
        </div>

        {/* Two-column layout */}
        <div className="flex gap-4">
          <div className="min-w-0 flex-1">
            <ReferenceList
              references={filtered}
              selectedIds={selectedIds}
              onToggle={toggleReference}
            />
          </div>
          <div className="hidden md:block">
            <SelectedReferencesPanel
              references={selectedRefs}
              onRemove={removeReference}
            />
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div
        data-testid="footer-bar"
        className="flex items-center justify-between border-t border-border bg-card px-6 py-4"
      >
        <Button
          variant="secondary"
          disabled
          data-testid="back-button"
        >
          {t('newDocument.backButton')}
        </Button>
        <Button
          data-testid="next-button"
          disabled={!hasSelection}
          onClick={() => goToStep(2)}
        >
          {t('newDocument.nextButton')}
        </Button>
      </div>
    </div>
  )
}

export default SelectReferencesStep
