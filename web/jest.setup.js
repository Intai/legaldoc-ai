/* eslint-disable no-console */

import { TextDecoder, TextEncoder } from 'node:util'

globalThis.TextEncoder = TextEncoder
globalThis.TextDecoder = TextDecoder

import '@testing-library/jest-dom'

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalInfo = console.info
console.info = jest.fn((...args) => {
  const message = typeof args[0] === 'string' ? args[0] : String(args[0] || '')

  if (message.includes('[INFO]') || message.includes('i18next is made possible by')) {
    return // Suppress info logs
  }
  originalInfo(...args)
})
