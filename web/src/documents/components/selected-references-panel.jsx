import React from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

function SelectedReferencesPanel({ references, onRemove }) {
  const { t } = useTranslation()

  return (
    <div
      className="w-[280px] shrink-0 self-start border border-border-default rounded-lg p-4 bg-card"
      data-testid="selected-references-panel"
    >
      <div className="text-sm font-semibold text-neutral-700 mb-3">
        {t('newDocument.selectedHeader', { count: references.length })}
      </div>

      {references.length === 0 ? (
        <div
          className="text-sm text-neutral-400 py-2"
          data-testid="selected-references-empty"
        >
          {t('newDocument.selectedEmpty')}
        </div>
      ) : (
        <div data-testid="selected-references-list">
          {references.map((ref, index) => (
            <div
              key={ref.id}
              className={`flex items-center justify-between gap-2 py-2${index > 0 ? ' border-t border-neutral-100' : ''}`}
              data-testid={`selected-reference-${ref.id}`}
            >
              <div className="flex flex-col gap-0.5 min-w-0 items-start">
                <span className="text-sm font-medium text-neutral-800">
                  {ref.title}
                </span>
                <span className="inline-flex items-center rounded-sm bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {ref.type}
                </span>
              </div>
              <button
                className="flex items-center justify-center size-6 border-none bg-transparent text-neutral-400 cursor-pointer rounded-sm shrink-0 transition-colors hover:text-error-600 hover:bg-error-50"
                onClick={() => onRemove(ref.id)}
                title="Remove"
                data-testid={`selected-reference-remove-${ref.id}`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SelectedReferencesPanel
