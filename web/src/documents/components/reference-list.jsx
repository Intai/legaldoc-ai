import React from 'react'
import { format } from 'date-fns'
import { Checkbox } from '@/shadcn/ui/checkbox'

function ReferenceList({ references, selectedIds, onToggle }) {

  return (
    <div data-testid="reference-list" className="border border-border-default rounded-lg overflow-hidden">
      {references.map((ref, index) => {
        const isChecked = selectedIds.includes(ref.id)

        return (
          <label
            key={ref.id}
            className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-neutral-50${index < references.length - 1 ? ' border-b border-neutral-100' : ''}${isChecked ? ' bg-primary-50' : ''}`}
            data-testid={`reference-item-${ref.id}`}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => onToggle(ref.id)}
              className="mt-0.5"
              data-testid={`reference-checkbox-${ref.id}`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold text-neutral-900 leading-snug">
                {ref.title}
              </div>
              <div className="text-sm text-neutral-500 mt-1 line-clamp-1">
                {ref.description}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-neutral-400">
                <span className="inline-flex items-center rounded-sm bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {ref.type}
                </span>
                <span className="text-xs">{format(new Date(ref.createdAt), 'MMM d')}</span>
              </div>
            </div>
          </label>
        )
      })}
    </div>
  )
}

export default ReferenceList
