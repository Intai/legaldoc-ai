import { useTranslation } from 'react-i18next'

export function AssistantPanelEmpty() {
  const { t } = useTranslation()

  return (
    <div
      className="text-sm leading-relaxed text-text-secondary"
      data-testid="assistant-panel-empty"
    >
      {t('assistant.noResults')}
    </div>
  )
}
