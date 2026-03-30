import { renderHook } from '@testing-library/react'
import { Subject } from 'rxjs'
import { useDialogStore } from './dialog-store'
import { useFilteredReferences, useNewDocumentStore, useSelectedReferences } from './new-document-store'
import { fetchGet, fetchPut, fetchSSE, fetchUpload } from '../utils/api.js'
import {
  PHASE_ANALYZING,
  PHASE_DRAFTING,
  PHASE_STRUCTURING,
} from '../constants.js'

jest.mock('../utils/api.js', () => ({
  fetchGet: jest.fn(),
  fetchPut: jest.fn(),
  fetchSSE: jest.fn(),
  fetchUpload: jest.fn(),
}))

const mockReferences = [
  { id: 'ref-1', title: 'Employment Contract', description: 'Standard employment agreement', type: 'Contract' },
  { id: 'ref-2', title: 'Privacy Policy', description: 'Data protection policy', type: 'Policy' },
  { id: 'ref-3', title: 'NDA Template', description: 'Non-disclosure agreement', type: 'NDA' },
]

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

beforeEach(() => {
  fetchGet.mockReset()
  fetchPut.mockReset()
  fetchSSE.mockReset()
  fetchUpload.mockReset()
  useNewDocumentStore.setState(initialState)
})

describe('new-document-store', () => {
  it('should have correct initial state values', () => {
    const state = useNewDocumentStore.getState()

    expect(state.currentStep).toBe(1)
    expect(state.references).toEqual([])
    expect(state.selectedReferenceIds).toEqual(new Set())
    expect(state.searchQuery).toBe('')
    expect(state.typeFilter).toBe('all')
    expect(state.context).toBe('')
    expect(state.generationPhase).toBeNull()
    expect(state.generatedDocumentId).toBeNull()
    expect(state.saving).toBe(false)
    expect(state.uploading).toBe(false)
  })

  it('should fetch references and store them', async () => {
    fetchGet.mockResolvedValue({ data: { references: mockReferences }, error: null })

    await useNewDocumentStore.getState().fetchReferences()
    const state = useNewDocumentStore.getState()

    expect(fetchGet).toHaveBeenCalledWith('/v1/references')
    expect(state.references).toEqual(mockReferences)
  })

  it('should handle fetch references error without crashing', async () => {
    fetchGet.mockResolvedValue({ data: null, error: { message: 'fail', code: 'ERR' } })

    await useNewDocumentStore.getState().fetchReferences()
    const state = useNewDocumentStore.getState()

    expect(state.references).toEqual([])
  })

  it('should upload a reference and prepend it to the list', async () => {
    const newRef = { id: 'ref-new', title: 'New Doc', description: 'Fresh', type: 'Contract' }
    fetchUpload.mockResolvedValue({ data: newRef, error: null })
    useNewDocumentStore.setState({ references: mockReferences })

    const file = new File(['content'], 'doc.pdf')
    await useNewDocumentStore.getState().uploadReference(file)
    const state = useNewDocumentStore.getState()

    expect(fetchUpload).toHaveBeenCalledWith('/v1/references', expect.any(FormData))
    expect(state.references[0]).toEqual(newRef)
    expect(state.references).toHaveLength(4)
    expect(state.uploading).toBe(false)
  })

  it('should set uploading to true while uploading a reference', async () => {
    let uploadingDuringCall = false
    fetchUpload.mockImplementation(() => {
      uploadingDuringCall = useNewDocumentStore.getState().uploading
      return Promise.resolve({ data: null, error: { message: 'fail', code: 'ERR' } })
    })

    const file = new File(['content'], 'doc.pdf')
    await useNewDocumentStore.getState().uploadReference(file)

    expect(uploadingDuringCall).toBe(true)
    expect(useNewDocumentStore.getState().uploading).toBe(false)
  })

  it('should not prepend reference when upload fails', async () => {
    fetchUpload.mockResolvedValue({ data: null, error: { message: 'fail', code: 'ERR' } })
    useNewDocumentStore.setState({ references: mockReferences })

    const file = new File(['content'], 'doc.pdf')
    await useNewDocumentStore.getState().uploadReference(file)
    const state = useNewDocumentStore.getState()

    expect(state.references).toEqual(mockReferences)
  })

  it('should toggle a reference ID in the selection set', () => {
    useNewDocumentStore.getState().toggleReference('ref-1')
    expect(useNewDocumentStore.getState().selectedReferenceIds).toEqual(new Set(['ref-1']))

    useNewDocumentStore.getState().toggleReference('ref-2')
    expect(useNewDocumentStore.getState().selectedReferenceIds).toEqual(new Set(['ref-1', 'ref-2']))

    useNewDocumentStore.getState().toggleReference('ref-1')
    expect(useNewDocumentStore.getState().selectedReferenceIds).toEqual(new Set(['ref-2']))
  })

  it('should remove a reference from the selection set', () => {
    useNewDocumentStore.setState({ selectedReferenceIds: new Set(['ref-1', 'ref-2']) })

    useNewDocumentStore.getState().removeReference('ref-1')

    expect(useNewDocumentStore.getState().selectedReferenceIds).toEqual(new Set(['ref-2']))
  })

  it('should handle removing an ID that is not in the selection set', () => {
    useNewDocumentStore.setState({ selectedReferenceIds: new Set(['ref-1']) })

    useNewDocumentStore.getState().removeReference('ref-999')

    expect(useNewDocumentStore.getState().selectedReferenceIds).toEqual(new Set(['ref-1']))
  })

  it('should set search query', () => {
    useNewDocumentStore.getState().setSearchQuery('employment')

    expect(useNewDocumentStore.getState().searchQuery).toBe('employment')
  })

  it('should set type filter', () => {
    useNewDocumentStore.getState().setTypeFilter('Contract')

    expect(useNewDocumentStore.getState().typeFilter).toBe('Contract')
  })

  it('should set context text', () => {
    useNewDocumentStore.getState().setContext('Some context about the document')

    expect(useNewDocumentStore.getState().context).toBe('Some context about the document')
  })

  it('should navigate to a specific step', () => {
    useNewDocumentStore.getState().goToStep(2)

    expect(useNewDocumentStore.getState().currentStep).toBe(2)
  })

  it('should reset generatedDocumentId when re-generating a document', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)
    useNewDocumentStore.setState({
      selectedReferenceIds: new Set(['ref-1']),
      context: 'My context',
      generatedDocumentId: 'old-doc-456',
    })

    useNewDocumentStore.getState().generateDocument()

    expect(useNewDocumentStore.getState().generatedDocumentId).toBeNull()
    expect(useNewDocumentStore.getState().generationPhase).toBe(PHASE_ANALYZING)

    subject.complete()
  })

  it('should generate a document and update phase from SSE events', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)
    useNewDocumentStore.setState({
      selectedReferenceIds: new Set(['ref-1', 'ref-2']),
      context: 'My context',
    })

    useNewDocumentStore.getState().generateDocument()

    expect(fetchSSE).toHaveBeenCalledWith('/v1/documents/generate', {
      referenceIds: ['ref-1', 'ref-2'],
      context: 'My context',
    })
    expect(useNewDocumentStore.getState().generationPhase).toBe(PHASE_ANALYZING)
    expect(useNewDocumentStore.getState().currentStep).toBe(3)

    subject.next({ event: 'phase', data: { phase: PHASE_STRUCTURING } })
    expect(useNewDocumentStore.getState().generationPhase).toBe(PHASE_STRUCTURING)

    subject.next({ event: 'phase', data: { phase: PHASE_DRAFTING } })
    expect(useNewDocumentStore.getState().generationPhase).toBe(PHASE_DRAFTING)

    subject.next({ event: 'complete', data: { documentId: 'doc-123' } })
    expect(useNewDocumentStore.getState().generationPhase).toBe('complete')
    expect(useNewDocumentStore.getState().generatedDocumentId).toBe('doc-123')

    subject.complete()
  })

  it('should ignore unrecognized SSE events without changing state', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)

    useNewDocumentStore.getState().generateDocument()

    subject.next({ event: 'unknown', data: { foo: 'bar' } })
    expect(useNewDocumentStore.getState().generationPhase).toBe(PHASE_ANALYZING)
    expect(useNewDocumentStore.getState().generatedDocumentId).toBeNull()

    subject.complete()
  })

  it('should reset generationPhase on SSE error', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)

    useNewDocumentStore.getState().generateDocument()
    expect(useNewDocumentStore.getState().generationPhase).toBe(PHASE_ANALYZING)

    subject.error({ message: 'fail', code: 'ERR' })
    expect(useNewDocumentStore.getState().generationPhase).toBeNull()
  })

  it('should reset generationPhase and show error dialog on SSE error event', () => {
    const subject = new Subject()
    fetchSSE.mockReturnValue(subject)
    const errorSpy = jest.spyOn(useDialogStore.getState(), 'error')

    useNewDocumentStore.getState().generateDocument()
    expect(useNewDocumentStore.getState().generationPhase).toBe(PHASE_ANALYZING)

    subject.next({ event: 'error', data: { message: 'No valid references found.', code: 'NOT_FOUND' } })

    expect(useNewDocumentStore.getState().generationPhase).toBeNull()
    expect(errorSpy).toHaveBeenCalledWith({ message: 'No valid references found.', code: 'NOT_FOUND' })

    errorSpy.mockRestore()
    subject.complete()
  })

  it('should save document and return true on success', async () => {
    fetchPut.mockResolvedValue({ data: { id: 'doc-123' }, error: null })
    useNewDocumentStore.setState({ generatedDocumentId: 'doc-123' })

    const result = await useNewDocumentStore.getState().saveDocument()

    expect(fetchPut).toHaveBeenCalledWith('/v1/documents/doc-123/status', { status: 'Done' })
    expect(result).toBe(true)
    expect(useNewDocumentStore.getState().saving).toBe(false)
  })

  it('should set saving to true while saving a document', async () => {
    let savingDuringCall = false
    fetchPut.mockImplementation(() => {
      savingDuringCall = useNewDocumentStore.getState().saving
      return Promise.resolve({ data: { id: 'doc-123' }, error: null })
    })
    useNewDocumentStore.setState({ generatedDocumentId: 'doc-123' })

    await useNewDocumentStore.getState().saveDocument()

    expect(savingDuringCall).toBe(true)
    expect(useNewDocumentStore.getState().saving).toBe(false)
  })

  it('should return false when save fails', async () => {
    fetchPut.mockResolvedValue({ data: null, error: { message: 'fail', code: 'ERR' } })
    useNewDocumentStore.setState({ generatedDocumentId: 'doc-123' })

    const result = await useNewDocumentStore.getState().saveDocument()

    expect(result).toBe(false)
    expect(useNewDocumentStore.getState().saving).toBe(false)
  })

  it('should return false and not call fetchPut when generatedDocumentId is null', async () => {
    useNewDocumentStore.setState({ generatedDocumentId: null })

    const result = await useNewDocumentStore.getState().saveDocument()

    expect(result).toBe(false)
    expect(fetchPut).not.toHaveBeenCalled()
  })
})

describe('useFilteredReferences', () => {
  it('should return all references when no filters applied', () => {
    useNewDocumentStore.setState({ references: mockReferences, searchQuery: '', typeFilter: 'all' })

    const { result } = renderHook(() => useFilteredReferences())

    expect(result.current).toEqual(mockReferences)
  })

  it('should filter by search query matching title (case-insensitive)', () => {
    useNewDocumentStore.setState({ references: mockReferences, searchQuery: 'employment', typeFilter: 'all' })

    const { result } = renderHook(() => useFilteredReferences())

    expect(result.current).toEqual([mockReferences[0]])
  })

  it('should filter by search query matching description (case-insensitive)', () => {
    useNewDocumentStore.setState({ references: mockReferences, searchQuery: 'DATA PROTECTION', typeFilter: 'all' })

    const { result } = renderHook(() => useFilteredReferences())

    expect(result.current).toEqual([mockReferences[1]])
  })

  it('should filter by type', () => {
    useNewDocumentStore.setState({ references: mockReferences, searchQuery: '', typeFilter: 'NDA' })

    const { result } = renderHook(() => useFilteredReferences())

    expect(result.current).toEqual([mockReferences[2]])
  })

  it('should filter by both search query and type', () => {
    useNewDocumentStore.setState({ references: mockReferences, searchQuery: 'contract', typeFilter: 'Contract' })

    const { result } = renderHook(() => useFilteredReferences())

    expect(result.current).toEqual([mockReferences[0]])
  })

  it('should return empty array when no references match', () => {
    useNewDocumentStore.setState({ references: mockReferences, searchQuery: 'nonexistent', typeFilter: 'all' })

    const { result } = renderHook(() => useFilteredReferences())

    expect(result.current).toEqual([])
  })

  it('should handle references with missing title or description', () => {
    const refs = [
      { id: 'ref-1', type: 'Contract' },
      { id: 'ref-2', title: 'Test', type: 'Policy' },
    ]
    useNewDocumentStore.setState({ references: refs, searchQuery: 'test', typeFilter: 'all' })

    const { result } = renderHook(() => useFilteredReferences())

    expect(result.current).toEqual([{ id: 'ref-2', title: 'Test', type: 'Policy' }])
  })
})

describe('useSelectedReferences', () => {
  it('should return references matching selected IDs', () => {
    useNewDocumentStore.setState({
      references: mockReferences,
      selectedReferenceIds: new Set(['ref-1', 'ref-3']),
    })

    const { result } = renderHook(() => useSelectedReferences())

    expect(result.current).toEqual([mockReferences[0], mockReferences[2]])
  })

  it('should return empty array when no references are selected', () => {
    useNewDocumentStore.setState({
      references: mockReferences,
      selectedReferenceIds: new Set(),
    })

    const { result } = renderHook(() => useSelectedReferences())

    expect(result.current).toEqual([])
  })

  it('should return empty array when references list is empty', () => {
    useNewDocumentStore.setState({
      references: [],
      selectedReferenceIds: new Set(['ref-1']),
    })

    const { result } = renderHook(() => useSelectedReferences())

    expect(result.current).toEqual([])
  })
})
