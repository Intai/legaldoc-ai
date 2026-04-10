const mockEnd = jest.fn()
const mockSetAttributes = jest.fn()
const mockStartSpan = jest.fn(() => ({
  setAttributes: mockSetAttributes,
  end: mockEnd,
}))
const mockGetTracer = jest.fn(() => ({ startSpan: mockStartSpan }))

jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: mockGetTracer,
  },
}), { virtual: true })

const mockOnLCP = jest.fn()
const mockOnINP = jest.fn()
const mockOnCLS = jest.fn()
const mockOnTTFB = jest.fn()
const mockOnFCP = jest.fn()

jest.mock('web-vitals', () => ({
  onLCP: mockOnLCP,
  onINP: mockOnINP,
  onCLS: mockOnCLS,
  onTTFB: mockOnTTFB,
  onFCP: mockOnFCP,
}), { virtual: true })

const { initWebVitals, recordWebVital } = require('./web-vitals.js')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('recordWebVital', () => {
  it('creates a span with the metric name and sets attributes from the metric', () => {
    const metric = {
      name: 'LCP',
      value: 2500,
      rating: 'good',
      navigationType: 'navigate',
    }

    recordWebVital(metric)

    expect(mockGetTracer).toHaveBeenCalledWith('web-vitals')
    expect(mockStartSpan).toHaveBeenCalledWith('web-vital.LCP')
    expect(mockSetAttributes).toHaveBeenCalledWith({
      'web_vital.name': 'LCP',
      'web_vital.value': 2500,
      'web_vital.rating': 'good',
      'web_vital.navigation_type': 'navigate',
    })
    expect(mockEnd).toHaveBeenCalled()
  })
})

describe('initWebVitals', () => {
  it('registers recordWebVital as the callback for all five web vital metrics', () => {
    initWebVitals()

    expect(mockOnLCP).toHaveBeenCalledWith(recordWebVital)
    expect(mockOnINP).toHaveBeenCalledWith(recordWebVital)
    expect(mockOnCLS).toHaveBeenCalledWith(recordWebVital)
    expect(mockOnTTFB).toHaveBeenCalledWith(recordWebVital)
    expect(mockOnFCP).toHaveBeenCalledWith(recordWebVital)
  })
})
