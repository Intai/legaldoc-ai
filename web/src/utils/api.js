import { Observable } from 'rxjs'
import config from '../config/index.js'
import { debug, error, warn } from '../logger.js'
import { useDialogStore } from '../stores/dialog-store.js'

/**
 * Performs a GET request to the API.
 * @param {string} path - The API endpoint path (e.g., '/v1/documents')
 * @param {Record<string, string>} [params] - Optional query parameters
 * @returns {Promise<{data: any, error: any}>} The response data or error
 */
export async function fetchGet(path, params = {}) {
  const url = new URL(`${config.apiBaseUrl}${path}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value != null) url.searchParams.set(key, value)
  })

  try {
    const response = await fetch(url.toString())
    const body = await response.json()

    if (body.error) {
      warn('API error', { method: 'GET', path, code: body.error.code, message: body.error.message })
      useDialogStore.getState().error(body.error)
      return { data: null, error: body.error }
    }

    return { data: body.data, error: null }
  } catch (err) {
    error('Network error', { method: 'GET', path, message: err.message })
    const networkError = { message: err.message, code: 'NETWORK_ERROR' }
    useDialogStore.getState().error(networkError)
    return { data: null, error: networkError }
  }
}

/**
 * Performs a POST request to the API with a JSON body.
 * @param {string} path - The API endpoint path
 * @param {any} data - The request body (will be JSON-serialized)
 * @returns {Promise<{data: any, error: any}>} The response data or error
 */
export async function fetchPost(path, data) {
  const url = `${config.apiBaseUrl}${path}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await response.json()

    if (body.error) {
      warn('API error', { method: 'POST', path, code: body.error.code, message: body.error.message })
      useDialogStore.getState().error(body.error)
      return { data: null, error: body.error }
    }

    return { data: body.data, error: null }
  } catch (err) {
    error('Network error', { method: 'POST', path, message: err.message })
    const networkError = { message: err.message, code: 'NETWORK_ERROR' }
    useDialogStore.getState().error(networkError)
    return { data: null, error: networkError }
  }
}

/**
 * Performs a POST request to the API with a FormData body.
 * Does not set Content-Type header, letting the browser set the multipart boundary.
 * @param {string} path - The API endpoint path
 * @param {FormData} formData - The FormData to upload
 * @returns {Promise<{data: any, error: any}>} The response data or error
 */
export async function fetchUpload(path, formData) {
  const url = `${config.apiBaseUrl}${path}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    const body = await response.json()

    if (body.error) {
      warn('API error', { method: 'POST', path, code: body.error.code, message: body.error.message })
      useDialogStore.getState().error(body.error)
      return { data: null, error: body.error }
    }

    return { data: body.data, error: null }
  } catch (err) {
    error('Network error', { method: 'POST', path, message: err.message })
    const networkError = { message: err.message, code: 'NETWORK_ERROR' }
    useDialogStore.getState().error(networkError)
    return { data: null, error: networkError }
  }
}

/**
 * Performs a PUT request to the API with a JSON body.
 * @param {string} path - The API endpoint path
 * @param {any} data - The request body (will be JSON-serialized)
 * @returns {Promise<{data: any, error: any}>} The response data or error
 */
export async function fetchPut(path, data) {
  const url = `${config.apiBaseUrl}${path}`

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await response.json()

    if (body.error) {
      warn('API error', { method: 'PUT', path, code: body.error.code, message: body.error.message })
      useDialogStore.getState().error(body.error)
      return { data: null, error: body.error }
    }

    return { data: body.data, error: null }
  } catch (err) {
    error('Network error', { method: 'PUT', path, message: err.message })
    const networkError = { message: err.message, code: 'NETWORK_ERROR' }
    useDialogStore.getState().error(networkError)
    return { data: null, error: networkError }
  }
}

/**
 * Sends a POST request with JSON body and returns an RxJS Observable
 * that emits parsed SSE events from the response stream.
 * @param {string} path - The API endpoint path
 * @param {any} data - The request body (will be JSON-serialized)
 * @returns {Observable<{event: string, data: any}>} Observable of SSE events
 */
export function fetchSSE(path, data) {
  const url = `${config.apiBaseUrl}${path}`

  return new Observable(subscriber => {
    const controller = new AbortController()

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    })
      .then(async response => {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
          const parts = buffer.split('\n\n')
          buffer = parts.pop()

          for (const part of parts) {
            if (!part.trim()) continue

            let event = 'message'
            let eventData = ''

            for (const line of part.split('\n')) {
              if (line.startsWith('event:')) {
                event = line.slice(6).trim()
              } else if (line.startsWith('data:')) {
                eventData = line.slice(5).trim()
              }
            }

            try {
              subscriber.next({ event, data: JSON.parse(eventData) })
            } catch {
              subscriber.next({ event, data: eventData })
            }
          }
        }

        subscriber.complete()
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          debug('SSE aborted', { path })
          subscriber.complete()
          return
        }
        error('SSE error', { path, message: err.message })
        const networkError = { message: err.message, code: 'NETWORK_ERROR' }
        useDialogStore.getState().error(networkError)
        subscriber.error(networkError)
      })

    return () => {
      controller.abort()
    }
  })
}
