import { concat } from 'ramda'
import { create } from 'zustand'
import { fetchGet } from '../utils/api.js'

const initialState = {
  documents: [],
  sort: 'recent',
  typeFilter: 'all',
  loading: false,
  loadingMore: false,
  nextCursor: null,
  hasMore: false,
}

/**
 * Documents store for managing the documents list, filtering, sorting,
 * and cursor-based pagination.
 *
 * State:
 * - `documents` {Array<Object>} - The list of document objects.
 * - `sort` {string} - Current sort selection ("recent" or "alpha").
 * - `typeFilter` {string} - Current type filter ("all", "Contract", "Policy", "Employment", "NDA").
 * - `loading` {boolean} - Whether the initial or filter load is in progress.
 * - `loadingMore` {boolean} - Whether a pagination load is in progress.
 * - `nextCursor` {string|null} - Cursor for the next page, or null if no more pages.
 * - `hasMore` {boolean} - Derived from nextCursor; true when more pages exist.
 *
 * Actions:
 * - `fetchDocuments(options)` - Fetches the first page of documents using the current
 *   sort and typeFilter. Resets the documents list and cursor.
 *   When `options.refresh` is true, uses `Math.max(documents.length, 6)` as the
 *   limit to preserve the visible count.
 * - `fetchMore()` - Fetches the next page using the cursor and appends results
 *   to the existing documents list.
 * - `setSort(sort)` - Updates the sort value and re-fetches documents.
 * - `setTypeFilter(type)` - Updates the typeFilter value and re-fetches documents.
 */
export const useDocumentsStore = create((set, get) => ({
  ...initialState,

  fetchDocuments: async ({ refresh } = {}) => {
    const { sort, typeFilter, documents } = get()
    const limit = refresh ? Math.max(documents.length, 6) : 6
    set({ loading: true })

    const { data } = await fetchGet('/v1/documents', {
      sort,
      type: typeFilter === 'all' ? null : typeFilter,
      cursor: null,
      limit: String(limit),
    })

    const cursor = data?.nextCursor ?? null
    set({
      documents: data?.documents ?? [],
      nextCursor: cursor,
      hasMore: cursor != null,
      loading: false,
    })
  },

  fetchMore: async () => {
    const { sort, typeFilter, nextCursor } = get()
    if (!nextCursor) return

    set({ loadingMore: true })

    const { data } = await fetchGet('/v1/documents', {
      sort,
      type: typeFilter === 'all' ? null : typeFilter,
      cursor: nextCursor,
      limit: '6',
    })

    const cursor = data?.nextCursor ?? null
    set(state => ({
      documents: concat(state.documents, data?.documents ?? []),
      nextCursor: cursor,
      hasMore: cursor != null,
      loadingMore: false,
    }))
  },

  setSort: async sort => {
    set({ sort })
    await get().fetchDocuments()
  },

  setTypeFilter: async typeFilter => {
    set({ typeFilter })
    await get().fetchDocuments()
  },

  clear: () => set(initialState),
}))
