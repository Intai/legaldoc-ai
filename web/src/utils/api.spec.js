import { fetchGet, fetchPost, fetchPut, fetchSSE, fetchUpload } from './api.js'
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

describe('fetchPost', () => {
  it('sends a POST request with JSON body and returns data on success', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ data: { id: 1 }, error: null }),
    })

    const result = await fetchPost('/v1/documents', { title: 'Test' })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/documents',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' }),
      }
    )
    expect(result).toEqual({ data: { id: 1 }, error: null })
    expect(mockError).not.toHaveBeenCalled()
  })

  it('triggers dialog store error and returns error on API error response', async () => {
    const apiError = { message: 'Validation failed', code: 'VALIDATION_ERROR' }
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ data: null, error: apiError }),
    })

    const result = await fetchPost('/v1/documents', { title: '' })

    expect(result).toEqual({ data: null, error: apiError })
    expect(mockError).toHaveBeenCalledWith(apiError)
  })

  it('triggers dialog store error and returns error on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'))

    const result = await fetchPost('/v1/documents', { title: 'Test' })

    expect(result).toEqual({
      data: null,
      error: { message: 'Network error', code: 'NETWORK_ERROR' },
    })
    expect(mockError).toHaveBeenCalledWith({
      message: 'Network error',
      code: 'NETWORK_ERROR',
    })
  })
})

describe('fetchUpload', () => {
  it('sends a POST request with FormData body and no Content-Type header', async () => {
    const formData = new FormData()
    formData.append('file', 'blob')
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ data: { id: 2 }, error: null }),
    })

    const result = await fetchUpload('/v1/documents/upload', formData)

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/documents/upload',
      {
        method: 'POST',
        body: formData,
      }
    )
    expect(result).toEqual({ data: { id: 2 }, error: null })
    expect(mockError).not.toHaveBeenCalled()
  })

  it('triggers dialog store error and returns error on API error response', async () => {
    const apiError = { message: 'File too large', code: 'FILE_TOO_LARGE' }
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ data: null, error: apiError }),
    })

    const result = await fetchUpload('/v1/documents/upload', new FormData())

    expect(result).toEqual({ data: null, error: apiError })
    expect(mockError).toHaveBeenCalledWith(apiError)
  })

  it('triggers dialog store error and returns error on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('Upload failed'))

    const result = await fetchUpload('/v1/documents/upload', new FormData())

    expect(result).toEqual({
      data: null,
      error: { message: 'Upload failed', code: 'NETWORK_ERROR' },
    })
    expect(mockError).toHaveBeenCalledWith({
      message: 'Upload failed',
      code: 'NETWORK_ERROR',
    })
  })
})

describe('fetchPut', () => {
  it('sends a PUT request with JSON body and returns data on success', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ data: { id: 1, title: 'Updated' }, error: null }),
    })

    const result = await fetchPut('/v1/documents/1/status', { title: 'Updated' })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/documents/1/status',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      }
    )
    expect(result).toEqual({ data: { id: 1, title: 'Updated' }, error: null })
    expect(mockError).not.toHaveBeenCalled()
  })

  it('triggers dialog store error and returns error on API error response', async () => {
    const apiError = { message: 'Not found', code: 'NOT_FOUND' }
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ data: null, error: apiError }),
    })

    const result = await fetchPut('/v1/documents/999/status', { title: 'Updated' })

    expect(result).toEqual({ data: null, error: apiError })
    expect(mockError).toHaveBeenCalledWith(apiError)
  })

  it('triggers dialog store error and returns error on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('Connection refused'))

    const result = await fetchPut('/v1/documents/1/status', { title: 'Updated' })

    expect(result).toEqual({
      data: null,
      error: { message: 'Connection refused', code: 'NETWORK_ERROR' },
    })
    expect(mockError).toHaveBeenCalledWith({
      message: 'Connection refused',
      code: 'NETWORK_ERROR',
    })
  })
})

describe('fetchSSE', () => {
  function createMockReader(chunks) {
    const encoder = new TextEncoder()
    let index = 0
    return {
      read: jest.fn(() => {
        if (index < chunks.length) {
          return Promise.resolve({
            done: false,
            value: encoder.encode(chunks[index++]),
          })
        }
        return Promise.resolve({ done: true })
      }),
    }
  }

  it('emits parsed SSE events from the response stream', done => {
    const reader = createMockReader([
      'event: status\ndata: {"progress":50}\n\n',
      'event: result\ndata: {"id":1}\n\n',
    ])
    global.fetch.mockResolvedValue({ body: { getReader: () => reader } })

    const events = []
    fetchSSE('/v1/generate', { prompt: 'test' }).subscribe({
      next: event => events.push(event),
      complete: () => {
        expect(events).toEqual([
          { event: 'status', data: { progress: 50 } },
          { event: 'result', data: { id: 1 } },
        ])
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/generate',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'test' }),
          })
        )
        done()
      },
    })
  })

  it('defaults event name to message when event field is absent', done => {
    const reader = createMockReader([
      'data: {"text":"hello"}\n\n',
    ])
    global.fetch.mockResolvedValue({ body: { getReader: () => reader } })

    const events = []
    fetchSSE('/v1/generate', {}).subscribe({
      next: event => events.push(event),
      complete: () => {
        expect(events).toEqual([
          { event: 'message', data: { text: 'hello' } },
        ])
        done()
      },
    })
  })

  it('emits raw string data when JSON parsing fails', done => {
    const reader = createMockReader([
      'event: log\ndata: plain text\n\n',
    ])
    global.fetch.mockResolvedValue({ body: { getReader: () => reader } })

    const events = []
    fetchSSE('/v1/generate', {}).subscribe({
      next: event => events.push(event),
      complete: () => {
        expect(events).toEqual([
          { event: 'log', data: 'plain text' },
        ])
        done()
      },
    })
  })

  it('handles SSE events split across chunks', done => {
    const reader = createMockReader([
      'event: status\ndata: {"p',
      'rogress":100}\n\n',
    ])
    global.fetch.mockResolvedValue({ body: { getReader: () => reader } })

    const events = []
    fetchSSE('/v1/generate', {}).subscribe({
      next: event => events.push(event),
      complete: () => {
        expect(events).toEqual([
          { event: 'status', data: { progress: 100 } },
        ])
        done()
      },
    })
  })

  it('triggers dialog store error and emits error on network failure', done => {
    global.fetch.mockRejectedValue(new Error('SSE connection failed'))

    fetchSSE('/v1/generate', {}).subscribe({
      error: err => {
        expect(err).toEqual({
          message: 'SSE connection failed',
          code: 'NETWORK_ERROR',
        })
        expect(mockError).toHaveBeenCalledWith({
          message: 'SSE connection failed',
          code: 'NETWORK_ERROR',
        })
        done()
      },
    })
  })

  it('aborts the fetch request when the subscription is unsubscribed', () => {
    let abortSignal
    global.fetch.mockImplementation((_url, options) => {
      abortSignal = options.signal
      return new Promise(() => {})
    })

    const subscription = fetchSSE('/v1/generate', {}).subscribe()
    subscription.unsubscribe()

    expect(abortSignal.aborted).toBe(true)
  })

  it('completes without error when fetch is aborted', async () => {
    global.fetch.mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted')
          abortError.name = 'AbortError'
          reject(abortError)
        })
      })
    })

    const errorFn = jest.fn()
    const completeFn = jest.fn()
    const subscription = fetchSSE('/v1/generate', {}).subscribe({
      error: errorFn,
      complete: completeFn,
    })

    subscription.unsubscribe()

    // Allow microtasks to flush so the AbortError catch runs
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(errorFn).not.toHaveBeenCalled()
    expect(mockError).not.toHaveBeenCalled()
  })

  it('ignores lines that are not event or data fields', done => {
    const reader = createMockReader([
      'id: 123\nevent: status\nretry: 5000\ndata: {"ok":true}\n\n',
    ])
    global.fetch.mockResolvedValue({ body: { getReader: () => reader } })

    const events = []
    fetchSSE('/v1/generate', {}).subscribe({
      next: event => events.push(event),
      complete: () => {
        expect(events).toEqual([
          { event: 'status', data: { ok: true } },
        ])
        done()
      },
    })
  })

  it('parses SSE events with CRLF line endings', done => {
    const reader = createMockReader([
      'event: status\r\ndata: {"progress":50}\r\n\r\n',
      'event: result\r\ndata: {"id":1}\r\n\r\n',
    ])
    global.fetch.mockResolvedValue({ body: { getReader: () => reader } })

    const events = []
    fetchSSE('/v1/generate', { prompt: 'test' }).subscribe({
      next: event => events.push(event),
      complete: () => {
        expect(events).toEqual([
          { event: 'status', data: { progress: 50 } },
          { event: 'result', data: { id: 1 } },
        ])
        done()
      },
    })
  })

  it('skips empty SSE parts between double newlines', done => {
    const reader = createMockReader([
      'event: status\ndata: {"ok":true}\n\n\n\nevent: done\ndata: {"ok":true}\n\n',
    ])
    global.fetch.mockResolvedValue({ body: { getReader: () => reader } })

    const events = []
    fetchSSE('/v1/generate', {}).subscribe({
      next: event => events.push(event),
      complete: () => {
        expect(events).toEqual([
          { event: 'status', data: { ok: true } },
          { event: 'done', data: { ok: true } },
        ])
        done()
      },
    })
  })
})
