import { create } from 'zustand'
import { fetchGet } from '../utils/api.js'

const initialState = {
  documents: {},
  loading: false,
}

/**
 * Document detail store for fetching and caching individual document metadata.
 *
 * State:
 * - `documents` {Object<string, Object>} - Document objects keyed by ID.
 * - `loading` {boolean} - Whether a fetch is in progress.
 *
 * Actions:
 * - `fetchDocument(id)` - Fetches a single document by ID from
 *   GET /v1/documents/{id} and caches the result keyed by ID.
 */
export const useDocumentDetailStore = create(set => ({
  ...initialState,

  fetchDocument: async id => {
    set({ loading: true })

    const { data } = await fetchGet(`/v1/documents/${id}`)

    set(state => ({
      documents: { ...state.documents, [id]: data ?? null },
      loading: false,
    }))
  },
}))
