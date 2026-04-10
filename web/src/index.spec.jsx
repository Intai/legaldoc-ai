const fs = require('fs')
const path = require('path')

const mockRender = jest.fn()
const mockCreateRoot = jest.fn(() => ({ render: mockRender }))

const mockInitTelemetry = jest.fn()

jest.mock('./telemetry.js', () => ({
  initTelemetry: mockInitTelemetry,
}))

jest.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}))

jest.mock('./components/app.jsx', () => ({
  __esModule: true,
  default: () => null,
}))

beforeEach(() => {
  jest.clearAllMocks()
  document.body.innerHTML = '<div id="root"></div>'
})

it('imports telemetry module', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, './index.jsx'),
    'utf-8'
  )
  const importLines = source
    .split('\n')
    .filter(line => line.startsWith('import '))

  expect(importLines.some(line => /from '\.\/telemetry\.js'/.test(line))).toBe(true)
})

it('initialises telemetry', () => {
  jest.isolateModules(() => {
    require('./index.jsx')
  })

  expect(mockInitTelemetry).toHaveBeenCalled()
})

it('renders the app into the root DOM element', () => {
  jest.isolateModules(() => {
    require('./index.jsx')
  })

  expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById('root'))
  expect(mockRender).toHaveBeenCalled()
})
