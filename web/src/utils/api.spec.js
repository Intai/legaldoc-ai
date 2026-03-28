import { fetchGet } from './api.js'
import { useDialogStore } from '../stores/dialog-store.js'

jest.mock('../stores/dialog-store.js', () => {
  const errorFn = jest.fn()
  return {
    useDialogStore: {
      getState: () => ({ error: errorFn }),
    },
  }
})

jest.mock('../config/index.js', () => ({
  default: { apiBaseUrl: 'http://localhost:8000/api' },
  __esModule: true,
}))

const mockError = useDialogStore.getState().error

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn()
})

afterEach(() => {
  delete global.fetch
})

describe('fetchGet', () => {
  it('returns data on a successful GET request', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ data: [{ id: 1 }], error: null }),
    })

    const result = await fetchGet('/v1/documents')

    expect(result).toEqual({ data: [{ id: 1 }], error: null })
    expect(mockError).not.toHaveBeenCalled()
  })

  it('triggers dialog store error and returns error on API error response', async () => {
    const apiError = { message: 'Not found', code: 'NOT_FOUND' }
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ data: null, error: apiError }),
    })

    const result = await fetchGet('/v1/documents')

    expect(result).toEqual({ data: null, error: apiError })
    expect(mockError).toHaveBeenCalledWith(apiError)
  })

  it('triggers dialog store error and returns error on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('Failed to fetch'))

    const result = await fetchGet('/v1/documents')

    expect(result).toEqual({
      data: null,
      error: { message: 'Failed to fetch', code: 'NETWORK_ERROR' },
    })
    expect(mockError).toHaveBeenCalledWith({
      message: 'Failed to fetch',
      code: 'NETWORK_ERROR',
    })
  })

  it('appends query params to the URL', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ data: [], error: null }),
    })

    await fetchGet('/v1/documents', { status: 'draft', page: '1' })

    const calledUrl = global.fetch.mock.calls[0][0]
    expect(calledUrl).toContain('status=draft')
    expect(calledUrl).toContain('page=1')
  })

  it('skips null and undefined query param values', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ data: [], error: null }),
    })

    await fetchGet('/v1/documents', { status: null, page: undefined, q: 'test' })

    const calledUrl = global.fetch.mock.calls[0][0]
    expect(calledUrl).not.toContain('status')
    expect(calledUrl).not.toContain('page')
    expect(calledUrl).toContain('q=test')
  })
})
