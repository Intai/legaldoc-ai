import { create } from 'zustand'
import { STATUS_DONE } from '../constants.js'
import { error as logError } from '../logger.js'
import { fetchGet, fetchPut } from '../utils/api.js'

const initialState = {
  documents: {},
  loading: false,
  saving: false,
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
 * - `confirmDraft(id)` - Confirms a draft document by updating its status
 *   to Done via PUT /v1/documents/{id}/status and caches the updated document.
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

  /**
   * Confirms a draft document by setting its status to Done.
   * @param {string} id - The document ID to confirm
   * @returns {Promise<boolean>} Whether the confirmation succeeded
   */
  confirmDraft: async id => {
    if (!id) return false

    set({ saving: true })
    const { data } = await fetchPut(`/v1/documents/${id}/status`, {
      status: STATUS_DONE,
    })

    if (data) {
      set(state => ({
        documents: { ...state.documents, [id]: data },
        saving: false,
      }))
    } else {
      logError('Draft confirmation failed', { documentId: id })
      set({ saving: false })
    }

    return !!data
  },
}))
