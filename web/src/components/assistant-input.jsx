import React, { useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Loader2, Search } from 'lucide-react'
import { Input } from '@/shadcn/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/shadcn/ui/popover'
import { useAssistantStore } from '../stores/assistant-store'
import { AssistantPanel } from './assistant-panel'

const preventFocus = e => e.preventDefault()

function AssistantInput() {
  const { t } = useTranslation()
  const anchorRef = useRef(null)
  const { query, editing, loading, open, setQuery, submitQuery, focusQuery, close } = useAssistantStore()

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      submitQuery()
    }
  }

  const handleOpenChange = nextOpen => {
    if (!nextOpen) {
      close()
    }
  }

  const handleInteractOutside = e => {
    if (anchorRef.current?.contains(e.target)) {
      e.preventDefault()
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative max-w-[480px] max-md:max-w-none max-md:w-full">
          {loading
            ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400 animate-spin" />
            : <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />}
          <Input
            type="text"
            placeholder={t('assistant.placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={focusQuery}
            onKeyDown={handleKeyDown}
            className={`pl-10 ${editing && !open ? 'pr-24' : ''}`}
            data-testid="assistant-input"
          />
          {editing && !open && query?.trim() && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-muted"
              data-testid="assistant-enter-hint"
            >
              <Trans
                i18nKey="assistant.pressEnter"
                components={{
                  kbd: <kbd className="px-1.5 py-0.5 rounded-sm bg-bg-subtle border border-border-default text-text-muted font-mono text-[10px]" />,
                }}
              />
            </span>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="max-w-[480px] max-md:max-w-[calc(100vw-2rem)] w-[var(--radix-popover-trigger-width)] max-md:w-[calc(100vw-2rem)] p-0 bg-bg-card rounded-xl border-border-default shadow-panel"
        sideOffset={6}
        align="start"
        collisionPadding={16}
        onOpenAutoFocus={preventFocus}
        onCloseAutoFocus={preventFocus}
        onInteractOutside={handleInteractOutside}
      >
        <AssistantPanel />
      </PopoverContent>
    </Popover>
  )
}

export { AssistantInput }
