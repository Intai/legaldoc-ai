import { create } from 'zustand'
import { info, error as logError, warn } from '../logger.js'
import { fetchSSE } from '../utils/api.js'
import { useDialogStore } from './dialog-store.js'

const initialState = {
  query: '',
  answer: '',
  sources: [],
  loading: false,
  error: null,
  editing: false,
  open: false,
  subscription: null,
}

/**
 * Assistant store for managing the AI query assistant panel.
 *
 * State:
 * - `query` {string} - The user's query text.
 * - `answer` {string} - The accumulated answer from SSE token events.
 * - `sources` {Array<Object>} - Source references returned on completion.
 * - `loading` {boolean} - Whether a query is in progress.
 * - `error` {Object|null} - The last error, if any.
 * - `editing` {boolean} - Whether the query text is being edited.
 * - `open` {boolean} - Whether the assistant panel is open.
 *
 * Actions:
 * - `setQuery(query)` - Sets the query text and marks editing as true.
 * - `submitQuery()` - Submits the query via SSE and streams the answer.
 * - `focusQuery()` - Re-opens the panel if not editing and a previous answer exists.
 * - `close()` - Closes the assistant panel.
 * - `clear()` - Resets all state to initial values.
 */
export const useAssistantStore = create((set, get) => ({
  ...initialState,

  setQuery: query => {
    get().subscription?.unsubscribe()
    set({ query, loading: false, editing: true, open: false, subscription: null })
  },

  submitQuery: () => {
    const { query } = get()
    if (!query?.trim()) return
    get().subscription?.unsubscribe()
    info('Query submitted', { queryLength: query.length })
    set({ loading: true, answer: '', sources: [], error: null, editing: false, open: true })

    const subscription = fetchSSE('/v1/assistant/query', {
      query,
    }).subscribe({
      next: ({ event, data }) => {
        if (event === 'token') {
          set(state => ({ answer: state.answer + data.text }))
        } else if (event === 'complete') {
          set({ sources: data.sources, loading: false })
        } else if (event === 'error') {
          warn('Query error event', { code: data.code, message: data.message })
          useDialogStore.getState().error(data)
          set({ loading: false, error: data })
        }
      },
      error: () => {
        logError('Query stream failed')
        set({ loading: false })
      },
    })
    set({ subscription })
  },

  focusQuery: () => {
    const { loading, editing, answer } = get()
    if (!editing && (loading || answer)) {
      set({ open: true })
    }
  },

  close: () => set({ open: false }),

  clear: () => {
    get().subscription?.unsubscribe()
    set(initialState)
  },
}))
