import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shadcn/ui/skeleton'

export function AssistantPanelLoading() {
  const { t } = useTranslation()

  return (
    <div data-testid="assistant-panel-loading">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-text-secondary">
          {t('assistant.thinking')}
        </span>
      </div>

      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-[90%]" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>

      <div className="mt-4 pt-3 border-t border-border-default">
        <Skeleton className="h-3 w-16 mb-2.5" />
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
