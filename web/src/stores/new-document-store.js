import { filter, prepend, test as rTest, toLower } from 'ramda'
import { create } from 'zustand'
import { PHASE_ANALYZING, STATUS_DONE } from '../constants.js'
import { fetchGet, fetchPut, fetchSSE, fetchUpload } from '../utils/api.js'
import { useDialogStore } from './dialog-store.js'

const initialState = {
  currentStep: 1,
  references: [],
  selectedReferenceIds: new Set(),
  searchQuery: '',
  typeFilter: 'all',
  context: '',
  generationPhase: null,
  generatedDocumentId: null,
  saving: false,
  uploading: false,
}

/**
 * Returns references filtered by search query and type.
 * Search matches against both title and description (case-insensitive).
 * @param {Array<Object>} references - The full list of references
 * @param {string} searchQuery - The search query string
 * @param {string} typeFilter - The type filter ("all" or a specific type)
 * @returns {Array<Object>} Filtered references
 */
function filteredReferences(references, searchQuery, typeFilter) {
  const query = toLower(searchQuery)
  const matchesQuery = ref => {
    if (!query) return true
    const pattern = rTest(new RegExp(query, 'i'))
    return pattern(ref.title ?? '') || pattern(ref.description ?? '')
  }
  const matchesType = ref => typeFilter === 'all' || ref.type === typeFilter

  return filter(ref => matchesQuery(ref) && matchesType(ref), references)
}

/**
 * New document store for managing the multi-step document creation workflow.
 *
 * State:
 * - `currentStep` {number} - Current wizard step (1-3).
 * - `references` {Array<Object>} - Fetched reference documents.
 * - `selectedReferenceIds` {Set<string>} - IDs of selected references.
 * - `searchQuery` {string} - Search query for filtering references.
 * - `typeFilter` {string} - Type filter for references ("all" or a specific type).
 * - `context` {string} - User-provided context textarea value.
 * - `generationPhase` {string|null} - Current generation phase.
 * - `generatedDocumentId` {string|null} - ID of the generated document.
 * - `saving` {boolean} - Whether save is in progress.
 * - `uploading` {boolean} - Whether file upload is in progress.
 *
 * Actions:
 * - `fetchReferences()` - Fetches references from GET /v1/references.
 * - `uploadReference(file)` - Uploads a file via POST /v1/references.
 * - `toggleReference(id)` - Toggles a reference in the selection set.
 * - `removeReference(id)` - Removes a reference from the selection set.
 * - `setSearchQuery(q)` - Sets the search query.
 * - `setTypeFilter(type)` - Sets the type filter.
 * - `setContext(text)` - Sets the context text.
 * - `goToStep(n)` - Navigates to a specific step.
 * - `generateDocument()` - Starts document generation via SSE.
 * - `saveDocument()` - Saves the document and navigates to its detail page.
 */
export const useNewDocumentStore = create((set, get) => ({
  ...initialState,

  fetchReferences: async () => {
    const { data } = await fetchGet('/v1/references')
    set({ references: data?.references ?? [] })
  },

  uploadReference: async file => {
    set({ uploading: true })
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await fetchUpload('/v1/references', formData)
    if (data) {
      set(state => ({ references: prepend(data, state.references) }))
    }
    set({ uploading: false })
  },

  toggleReference: id => {
    set(state => {
      const next = new Set(state.selectedReferenceIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedReferenceIds: next }
    })
  },

  removeReference: id => {
    set(state => {
      const next = new Set(state.selectedReferenceIds)
      next.delete(id)
      return { selectedReferenceIds: next }
    })
  },

  setSearchQuery: searchQuery => set({ searchQuery }),

  setTypeFilter: typeFilter => set({ typeFilter }),

  setContext: context => set({ context }),

  goToStep: currentStep => set({ currentStep }),

  generateDocument: () => {
    const { selectedReferenceIds, context } = get()
    set({ generationPhase: PHASE_ANALYZING, generatedDocumentId: null, currentStep: 3 })

    const subscription = fetchSSE('/v1/documents/generate', {
      referenceIds: [...selectedReferenceIds],
      context,
    }).subscribe({
      next: ({ event, data }) => {
        if (event === 'phase') {
          set({ generationPhase: data.phase })
        } else if (event === 'complete') {
          set({
            generationPhase: 'complete',
            generatedDocumentId: data.documentId,
          })
        } else if (event === 'error') {
          useDialogStore.getState().error(data)
          set({ generationPhase: null })
        }
      },
      error: () => {
        set({ generationPhase: null })
      },
      complete: () => {
        subscription.unsubscribe()
      },
    })
  },

  saveDocument: async () => {
    const { generatedDocumentId } = get()
    if (!generatedDocumentId) return false

    set({ saving: true })
    const { data } = await fetchPut(`/v1/documents/${generatedDocumentId}/status`, {
      status: STATUS_DONE,
    })
    set({ saving: false })

    return !!data
  },
}))

/**
 * Returns filtered references derived from store state.
 * @returns {Array<Object>} Filtered references
 */
export function useFilteredReferences() {
  const references = useNewDocumentStore(s => s.references)
  const searchQuery = useNewDocumentStore(s => s.searchQuery)
  const typeFilter = useNewDocumentStore(s => s.typeFilter)
  return filteredReferences(references, searchQuery, typeFilter)
}

/**
 * Returns selected references derived from store state.
 * @returns {Array<Object>} Selected references
 */
export function useSelectedReferences() {
  const references = useNewDocumentStore(s => s.references)
  const selectedReferenceIds = useNewDocumentStore(s => s.selectedReferenceIds)
  return filter(ref => selectedReferenceIds.has(ref.id), references)
}
