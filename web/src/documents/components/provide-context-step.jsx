import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shadcn/ui/button'
import { Textarea } from '@/shadcn/ui/textarea'
import { useNewDocumentStore, useSelectedReferences } from '@/stores/new-document-store'

function ProvideContextStep() {
  const { t } = useTranslation()
  const context = useNewDocumentStore(s => s.context)
  const setContext = useNewDocumentStore(s => s.setContext)
  const goToStep = useNewDocumentStore(s => s.goToStep)
  const generateDocument = useNewDocumentStore(s => s.generateDocument)

  const selectedRefs = useSelectedReferences()
  const selectedCount = selectedRefs.length

  return (
    <div data-testid="provide-context-step" className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto p-6 pt-0 max-md:px-4">
        {/* References summary card */}
        <div
          data-testid="references-summary"
          className="rounded-xl border border-border bg-neutral-50 p-4"
        >
          <div className="mb-2 text-sm font-medium text-neutral-600">
            {t('newDocument.usingReferences', { count: selectedCount })}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedRefs.map((ref, index) => (
              <span
                key={ref.id}
                className="inline-flex items-center text-sm text-neutral-800"
                data-testid={`summary-ref-${ref.id}`}
              >
                {ref.title}
                <span className="ml-2 inline-flex items-center rounded-sm bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {ref.type}
                </span>
                {index < selectedCount - 1 && <span>,</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Context input */}
        <div>
          <label
            htmlFor="context-textarea"
            className="text-sm font-semibold text-neutral-700"
          >
            {t('newDocument.contextLabel')}
          </label>
          <p className="mb-3 mt-1 text-sm text-neutral-400">
            {t('newDocument.contextHelper')}
          </p>
          <Textarea
            id="context-textarea"
            data-testid="context-textarea"
            className="min-h-[200px] w-full"
            value={context}
            onChange={e => setContext(e.target.value)}
          />
        </div>
      </div>

      {/* Footer bar */}
      <div
        data-testid="footer-bar"
        className="flex items-center justify-between border-t border-border bg-card px-6 py-4"
      >
        <Button
          variant="secondary"
          data-testid="back-button"
          onClick={() => goToStep(1)}
        >
          {t('newDocument.backButton')}
        </Button>
        <Button
          data-testid="generate-button"
          disabled={!context.trim()}
          onClick={generateDocument}
        >
          {t('newDocument.generateButton')}
        </Button>
      </div>
    </div>
  )
}

export default ProvideContextStep
