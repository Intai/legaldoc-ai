import { useDocumentsStore } from './documents-store'
import { fetchGet } from '../utils/api.js'

jest.mock('../utils/api.js', () => ({
  fetchGet: jest.fn(),
}))

const mockDocumentsPage1 = [
  { id: '1', title: 'Contract A', type: 'Contract' },
  { id: '2', title: 'Policy B', type: 'Policy' },
]

const mockDocumentsPage2 = [
  { id: '3', title: 'NDA C', type: 'NDA' },
]

beforeEach(() => {
  fetchGet.mockReset()
  useDocumentsStore.setState({
    documents: [],
    sort: 'recent',
    typeFilter: 'all',
    loading: false,
    loadingMore: false,
    nextCursor: null,
    hasMore: false,
  })
})

describe('documents-store', () => {
  it('should have correct initial state values', () => {
    const state = useDocumentsStore.getState()

    expect(state.documents).toEqual([])
    expect(state.sort).toBe('recent')
    expect(state.typeFilter).toBe('all')
    expect(state.loading).toBe(false)
    expect(state.loadingMore).toBe(false)
    expect(state.nextCursor).toBeNull()
    expect(state.hasMore).toBe(false)
  })

  it('should fetch documents and update state on success', async () => {
    fetchGet.mockResolvedValue({
      data: { documents: mockDocumentsPage1, nextCursor: 'cursor1' },
      error: null,
    })

    await useDocumentsStore.getState().fetchDocuments()
    const state = useDocumentsStore.getState()

    expect(fetchGet).toHaveBeenCalledWith('/v1/documents', {
      sort: 'recent',
      type: null,
      cursor: null,
      limit: '6',
    })
    expect(state.documents).toEqual(mockDocumentsPage1)
    expect(state.nextCursor).toBe('cursor1')
    expect(state.hasMore).toBe(true)
    expect(state.loading).toBe(false)
  })

  it('should set loading to true while fetching documents', async () => {
    let loadingDuringFetch = false
    fetchGet.mockImplementation(() => {
      loadingDuringFetch = useDocumentsStore.getState().loading
      return Promise.resolve({ data: { documents: [], nextCursor: null }, error: null })
    })

    await useDocumentsStore.getState().fetchDocuments()

    expect(loadingDuringFetch).toBe(true)
    expect(useDocumentsStore.getState().loading).toBe(false)
  })

  it('should pass type filter param when typeFilter is not all', async () => {
    fetchGet.mockResolvedValue({
      data: { documents: [], nextCursor: null },
      error: null,
    })
    useDocumentsStore.setState({ typeFilter: 'Contract' })

    await useDocumentsStore.getState().fetchDocuments()

    expect(fetchGet).toHaveBeenCalledWith('/v1/documents', {
      sort: 'recent',
      type: 'Contract',
      cursor: null,
      limit: '6',
    })
  })

  it('should append documents when fetchMore is called', async () => {
    useDocumentsStore.setState({
      documents: mockDocumentsPage1,
      nextCursor: 'cursor1',
    })
    fetchGet.mockResolvedValue({
      data: { documents: mockDocumentsPage2, nextCursor: null },
      error: null,
    })

    await useDocumentsStore.getState().fetchMore()
    const state = useDocumentsStore.getState()

    expect(state.documents).toEqual([...mockDocumentsPage1, ...mockDocumentsPage2])
    expect(state.nextCursor).toBeNull()
    expect(state.hasMore).toBe(false)
    expect(state.loadingMore).toBe(false)
  })

  it('should pass correct params to fetchGet when fetchMore is called', async () => {
    useDocumentsStore.setState({
      documents: mockDocumentsPage1,
      nextCursor: 'cursor1',
      sort: 'alpha',
    })
    fetchGet.mockResolvedValue({
      data: { documents: mockDocumentsPage2, nextCursor: null },
      error: null,
    })

    await useDocumentsStore.getState().fetchMore()

    expect(fetchGet).toHaveBeenCalledWith('/v1/documents', {
      sort: 'alpha',
      type: null,
      cursor: 'cursor1',
      limit: '6',
    })
  })

  it('should pass type filter param when fetchMore and typeFilter is not all', async () => {
    useDocumentsStore.setState({
      documents: mockDocumentsPage1,
      nextCursor: 'cursor1',
      typeFilter: 'Contract',
    })
    fetchGet.mockResolvedValue({
      data: { documents: mockDocumentsPage2, nextCursor: null },
      error: null,
    })

    await useDocumentsStore.getState().fetchMore()

    expect(fetchGet).toHaveBeenCalledWith('/v1/documents', {
      sort: 'recent',
      type: 'Contract',
      cursor: 'cursor1',
      limit: '6',
    })
  })

  it('should set loadingMore to true while fetching more', async () => {
    useDocumentsStore.setState({ nextCursor: 'cursor1' })
    let loadingMoreDuringFetch = false
    fetchGet.mockImplementation(() => {
      loadingMoreDuringFetch = useDocumentsStore.getState().loadingMore
      return Promise.resolve({ data: { documents: [], nextCursor: null }, error: null })
    })

    await useDocumentsStore.getState().fetchMore()

    expect(loadingMoreDuringFetch).toBe(true)
    expect(useDocumentsStore.getState().loadingMore).toBe(false)
  })

  it('should not fetch more when nextCursor is null', async () => {
    useDocumentsStore.setState({ nextCursor: null })

    await useDocumentsStore.getState().fetchMore()

    expect(fetchGet).not.toHaveBeenCalled()
  })

  it('should set hasMore to false when fetchDocuments returns null nextCursor', async () => {
    fetchGet.mockResolvedValue({
      data: { documents: mockDocumentsPage1, nextCursor: null },
      error: null,
    })

    await useDocumentsStore.getState().fetchDocuments()
    const state = useDocumentsStore.getState()

    expect(state.documents).toEqual(mockDocumentsPage1)
    expect(state.nextCursor).toBeNull()
    expect(state.hasMore).toBe(false)
  })

  it('should update sort and re-fetch documents', async () => {
    fetchGet.mockResolvedValue({
      data: { documents: mockDocumentsPage1, nextCursor: null },
      error: null,
    })

    await useDocumentsStore.getState().setSort('alpha')
    const state = useDocumentsStore.getState()

    expect(state.sort).toBe('alpha')
    expect(fetchGet).toHaveBeenCalledWith('/v1/documents', {
      sort: 'alpha',
      type: null,
      cursor: null,
      limit: '6',
    })
  })

  it('should update typeFilter and re-fetch documents', async () => {
    fetchGet.mockResolvedValue({
      data: { documents: mockDocumentsPage2, nextCursor: null },
      error: null,
    })

    await useDocumentsStore.getState().setTypeFilter('NDA')
    const state = useDocumentsStore.getState()

    expect(state.typeFilter).toBe('NDA')
    expect(fetchGet).toHaveBeenCalledWith('/v1/documents', {
      sort: 'recent',
      type: 'NDA',
      cursor: null,
      limit: '6',
    })
    expect(state.documents).toEqual(mockDocumentsPage2)
  })

  it('should handle fetch error without crashing', async () => {
    fetchGet.mockResolvedValue({ data: null, error: { message: 'fail', code: 'ERR' } })

    await useDocumentsStore.getState().fetchDocuments()
    const state = useDocumentsStore.getState()

    expect(state.documents).toEqual([])
    expect(state.nextCursor).toBeNull()
    expect(state.hasMore).toBe(false)
    expect(state.loading).toBe(false)
  })

  it('should reset to initial state when clear is called', async () => {
    fetchGet.mockResolvedValue({
      data: { documents: mockDocumentsPage1, nextCursor: 'cursor1' },
      error: null,
    })
    await useDocumentsStore.getState().fetchDocuments()
    useDocumentsStore.setState({ sort: 'alpha', typeFilter: 'Contract' })

    useDocumentsStore.getState().clear()
    const state = useDocumentsStore.getState()

    expect(state.documents).toEqual([])
    expect(state.sort).toBe('recent')
    expect(state.typeFilter).toBe('all')
    expect(state.loading).toBe(false)
    expect(state.loadingMore).toBe(false)
    expect(state.nextCursor).toBeNull()
    expect(state.hasMore).toBe(false)
  })

  it('should handle fetchMore error without crashing', async () => {
    useDocumentsStore.setState({
      documents: mockDocumentsPage1,
      nextCursor: 'cursor1',
    })
    fetchGet.mockResolvedValue({ data: null, error: { message: 'fail', code: 'ERR' } })

    await useDocumentsStore.getState().fetchMore()
    const state = useDocumentsStore.getState()

    expect(state.documents).toEqual(mockDocumentsPage1)
    expect(state.nextCursor).toBeNull()
    expect(state.hasMore).toBe(false)
    expect(state.loadingMore).toBe(false)
  })
})
