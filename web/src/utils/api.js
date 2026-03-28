import config from '../config/index.js'
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
      useDialogStore.getState().error(body.error)
      return { data: null, error: body.error }
    }

    return { data: body.data, error: null }
  } catch (err) {
    const error = { message: err.message, code: 'NETWORK_ERROR' }
    useDialogStore.getState().error(error)
    return { data: null, error }
  }
}
