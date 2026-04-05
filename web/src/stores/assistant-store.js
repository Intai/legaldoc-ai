import { create } from 'zustand'
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

  setQuery: query => set({ query, editing: true, open: false }),

  submitQuery: () => {
    const { query } = get()
    if (!query?.trim()) return
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
          useDialogStore.getState().error(data)
          set({ loading: false, error: data })
        }
      },
      error: () => {
        set({ loading: false })
      },
      complete: () => {
        subscription.unsubscribe()
      },
    })
  },

  focusQuery: () => {
    const { loading, editing, answer } = get()
    if (!editing && (loading || answer)) {
      set({ open: true })
    }
  },

  close: () => set({ open: false }),

  clear: () => set(initialState),
}))
