import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import i18n from '../i18n'
import { error as logError } from '../logger.js'

const initialState = {
  stack: [],
}

/**
 * Global dialog store for managing a FILO stack of dialogs.
 *
 * State:
 * - `stack` {Array<{ title, description, variant }>} - Stack of dialog entries.
 *
 * Actions:
 * - `error(apiError)` - Pushes an error dialog onto the stack. Receives an API
 *   error response `{ message, code }`. Sets title from i18n "error.dialogTitle"
 *   and description from `apiError.message`, falling back to i18n
 *   "error.dialogDescription".
 * - `close()` - Pops the top dialog off the stack.
 */
export const useDialogStore = create(set => ({
  ...initialState,

  error: apiError => {
    logError('Dialog error', { code: apiError?.code, message: apiError?.message })
    return set(state => ({
      stack: [
        ...state.stack,
        {
          variant: 'error',
          title: i18n.t('error.dialogTitle'),
          description: apiError?.message || i18n.t('error.dialogDescription'),
        },
      ],
    }))
  },

  close: () => set(state => ({ stack: state.stack.slice(0, -1) })),
}))

/**
 * Custom hook that returns the latest (top) dialog from the stack.
 * @returns {{ open: boolean, title: string, description: string, variant: string }}
 */
export function useDialog() {
  return useDialogStore(
    useShallow(s => {
      const top = s.stack[s.stack.length - 1]
      return {
        open: s.stack.length > 0,
        title: top?.title ?? '',
        description: top?.description ?? '',
        variant: top?.variant ?? '',
      }
    }),
  )
}
