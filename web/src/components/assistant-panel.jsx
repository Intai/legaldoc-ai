import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useAssistantStore } from '@/stores/assistant-store'
import { AssistantPanelEmpty } from './assistant-panel-empty'
import { AssistantPanelLoading } from './assistant-panel-loading'

export function AssistantPanel() {
  const { t } = useTranslation()
  const loading = useAssistantStore(s => s.loading)
  const answer = useAssistantStore(s => s.answer)
  const sources = useAssistantStore(s => s.sources)
  const close = useAssistantStore(s => s.close)

  const hasAnswer = answer.length > 0
  const hasSources = sources.length > 0
  const isEmpty = !loading && !hasAnswer && !hasSources

  return (
    <div
      className="max-h-[460px] overflow-y-auto"
      data-testid="assistant-panel"
    >
      <div className="p-4">
        {loading && !hasAnswer && <AssistantPanelLoading />}

        {isEmpty && <AssistantPanelEmpty />}

        {hasAnswer && (
          <div
            className="text-sm leading-relaxed text-text-secondary"
            data-testid="assistant-answer"
          >
            {answer}
          </div>
        )}

        {hasSources && (
          <div className="mt-4 pt-3 border-t border-border-default">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2.5">
              {t('assistant.sources')}
            </div>
            <div className="space-y-2" data-testid="assistant-sources">
              {sources.map(source => (
                <Link
                  key={source.documentId}
                  to={`/documents/${source.documentId}`}
                  onClick={close}
                  className="block rounded-lg border border-border-default p-3 hover:bg-bg-subtle hover:border-border-hover transition-colors group no-underline"
                  data-testid="assistant-source-link"
                >
                  <div className="flex items-start gap-2.5">
                    <FileText className="size-4 text-text-muted mt-0.5 shrink-0 group-hover:text-text-link transition-colors" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary group-hover:text-text-link transition-colors truncate">
                        {source.title}
                      </div>
                      {source.snippet && (
                        <div className="text-xs text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                          {source.snippet}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-border-default flex items-center justify-end">
          <span className="text-[11px] text-text-muted" data-testid="assistant-esc-hint">
            <Trans
              i18nKey="assistant.pressEsc"
              components={{
                kbd: <kbd className="px-1.5 py-0.5 rounded-sm bg-bg-subtle border border-border-default text-text-muted font-mono text-[10px]" />,
              }}
            />
          </span>
        </div>
      </div>
    </div>
  )
}
