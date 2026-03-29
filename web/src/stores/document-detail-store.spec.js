import { useDocumentDetailStore } from './document-detail-store'
import { fetchGet } from '../utils/api.js'

jest.mock('../utils/api.js', () => ({
  fetchGet: jest.fn(),
}))

const mockDocument = {
  id: 'doc-1',
  title: 'Employment Agreement',
  type: 'Employment',
  createdAt: '2026-03-01T00:00:00Z',
}

const mockDocument2 = {
  id: 'doc-2',
  title: 'NDA Agreement',
  type: 'NDA',
  createdAt: '2026-03-15T00:00:00Z',
}

beforeEach(() => {
  fetchGet.mockReset()
  useDocumentDetailStore.setState({
    documents: {},
    loading: false,
  })
})

describe('document-detail-store', () => {
  it('should have correct initial state values', () => {
    const state = useDocumentDetailStore.getState()

    expect(state.documents).toEqual({})
    expect(state.loading).toBe(false)
  })

  it('should fetch a document by ID and cache it', async () => {
    fetchGet.mockResolvedValue({ data: mockDocument, error: null })

    await useDocumentDetailStore.getState().fetchDocument('doc-1')
    const state = useDocumentDetailStore.getState()

    expect(fetchGet).toHaveBeenCalledWith('/v1/documents/doc-1')
    expect(state.documents['doc-1']).toEqual(mockDocument)
    expect(state.loading).toBe(false)
  })

  it('should set loading to true while fetching a document', async () => {
    let loadingDuringFetch = false
    fetchGet.mockImplementation(() => {
      loadingDuringFetch = useDocumentDetailStore.getState().loading
      return Promise.resolve({ data: mockDocument, error: null })
    })

    await useDocumentDetailStore.getState().fetchDocument('doc-1')

    expect(loadingDuringFetch).toBe(true)
    expect(useDocumentDetailStore.getState().loading).toBe(false)
  })

  it('should store multiple documents keyed by ID without overwriting', async () => {
    fetchGet.mockResolvedValueOnce({ data: mockDocument, error: null })
    fetchGet.mockResolvedValueOnce({ data: mockDocument2, error: null })

    await useDocumentDetailStore.getState().fetchDocument('doc-1')
    await useDocumentDetailStore.getState().fetchDocument('doc-2')
    const state = useDocumentDetailStore.getState()

    expect(state.documents['doc-1']).toEqual(mockDocument)
    expect(state.documents['doc-2']).toEqual(mockDocument2)
  })

  it('should handle fetch error without crashing', async () => {
    fetchGet.mockResolvedValue({ data: null, error: { message: 'fail', code: 'ERR' } })

    await useDocumentDetailStore.getState().fetchDocument('doc-1')
    const state = useDocumentDetailStore.getState()

    expect(state.documents['doc-1']).toBeNull()
    expect(state.loading).toBe(false)
  })
})
