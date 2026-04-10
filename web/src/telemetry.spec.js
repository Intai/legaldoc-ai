const mockRegister = jest.fn()
const mockStackContextManager = jest.fn()
const mockOTLPTraceExporter = jest.fn()
const mockBatchSpanProcessor = jest.fn()
const mockResourceFromAttributes = jest.fn(() => ({ 'service.name': 'legaldoc-ai-web' }))
const mockWebTracerProvider = jest.fn(() => ({
  register: mockRegister,
}))

const mockFetchSetTracerProvider = jest.fn()
const mockFetchEnable = jest.fn()
const mockFetchInstrumentation = jest.fn(() => ({
  setTracerProvider: mockFetchSetTracerProvider,
  enable: mockFetchEnable,
}))

const mockDocLoadSetTracerProvider = jest.fn()
const mockDocLoadEnable = jest.fn()
const mockDocumentLoadInstrumentation = jest.fn(() => ({
  setTracerProvider: mockDocLoadSetTracerProvider,
  enable: mockDocLoadEnable,
}))

const mockUserInteractionSetTracerProvider = jest.fn()
const mockUserInteractionEnable = jest.fn()
const mockUserInteractionInstrumentation = jest.fn(() => ({
  setTracerProvider: mockUserInteractionSetTracerProvider,
  enable: mockUserInteractionEnable,
}))

const mockInitLogger = jest.fn()
const mockSetActiveSpan = jest.fn()
const mockInitWebVitals = jest.fn()

const mockSpanEnd = jest.fn()
const mockStartSpan = jest.fn(() => ({
  setAttribute: jest.fn(),
  end: mockSpanEnd,
}))
const mockGetTracer = jest.fn(() => ({ startSpan: mockStartSpan }))

const mockContextWith = jest.fn((ctx, fn) => fn())
const mockSetSpan = jest.fn((ctx, span) => ({ _span: span }))
const mockContextActive = jest.fn(() => ({}))

jest.mock('@opentelemetry/api', () => ({
  context: {
    active: mockContextActive,
    with: mockContextWith,
  },
  trace: {
    getTracer: mockGetTracer,
    setSpan: mockSetSpan,
  },
}), { virtual: true })

jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: mockOTLPTraceExporter,
}), { virtual: true })

jest.mock('@opentelemetry/instrumentation-document-load', () => ({
  DocumentLoadInstrumentation: mockDocumentLoadInstrumentation,
}), { virtual: true })

jest.mock('@opentelemetry/instrumentation-fetch', () => ({
  FetchInstrumentation: mockFetchInstrumentation,
}), { virtual: true })

jest.mock('@opentelemetry/instrumentation-user-interaction', () => ({
  UserInteractionInstrumentation: mockUserInteractionInstrumentation,
}), { virtual: true })

jest.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: mockResourceFromAttributes,
}), { virtual: true })

jest.mock('@opentelemetry/sdk-trace-web', () => ({
  BatchSpanProcessor: mockBatchSpanProcessor,
  StackContextManager: mockStackContextManager,
  WebTracerProvider: mockWebTracerProvider,
}), { virtual: true })

jest.mock('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
}), { virtual: true })

jest.mock('./config/index.js', () => ({
  default: {
    apiBaseUrl: 'http://localhost:8000/api',
    otelExporterUrl: 'http://localhost:4318',
  },
  __esModule: true,
}))

jest.mock('./logger.js', () => ({
  initLogger: mockInitLogger,
  setActiveSpan: mockSetActiveSpan,
}))

jest.mock('./web-vitals.js', () => ({
  initWebVitals: mockInitWebVitals,
}))

window.fetch = jest.fn()

const { initTelemetry } = require('./telemetry.js')

beforeEach(() => {
  jest.clearAllMocks()
  window.fetch = jest.fn()
  mockStartSpan.mockReturnValue({ setAttribute: jest.fn(), end: mockSpanEnd })
  mockWebTracerProvider.mockImplementation(() => ({
    register: mockRegister,
  }))
})

describe('initTelemetry', () => {
  it('creates an OTLP exporter with the default collector URL', () => {
    initTelemetry()

    expect(mockOTLPTraceExporter).toHaveBeenCalledWith({
      url: 'http://localhost:4318/v1/traces',
    })
  })

  it('creates a WebTracerProvider with the service name and batch span processor', () => {
    initTelemetry()

    expect(mockResourceFromAttributes).toHaveBeenCalledWith({
      'service.name': 'legaldoc-ai-web',
    })
    expect(mockBatchSpanProcessor).toHaveBeenCalledWith(expect.any(Object))
    expect(mockWebTracerProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: expect.any(Object),
        spanProcessors: expect.arrayContaining([expect.any(Object)]),
      })
    )
  })

  it('registers the provider with StackContextManager', () => {
    const provider = initTelemetry()

    expect(provider.register).toHaveBeenCalledWith({
      contextManager: expect.any(Object),
    })
    expect(mockStackContextManager).toHaveBeenCalled()
  })

  it('configures FetchInstrumentation with propagateTraceHeaderCorsUrls matching the API base URL', () => {
    initTelemetry()

    const fetchArgs = mockFetchInstrumentation.mock.calls[0][0]
    expect(fetchArgs.propagateTraceHeaderCorsUrls).toHaveLength(1)
    expect(fetchArgs.propagateTraceHeaderCorsUrls[0]).toBeInstanceOf(RegExp)
    expect(fetchArgs.propagateTraceHeaderCorsUrls[0].test('http://localhost:8000/api/v1/docs')).toBe(true)
  })

  it('configures FetchInstrumentation to ignore OpenTelemetry exporter URLs', () => {
    initTelemetry()

    const fetchArgs = mockFetchInstrumentation.mock.calls[0][0]
    expect(fetchArgs.ignoreUrls).toHaveLength(1)
    expect(fetchArgs.ignoreUrls[0]).toBeInstanceOf(RegExp)
    expect(fetchArgs.ignoreUrls[0].test('http://localhost:4318/v1/traces')).toBe(true)
  })

  it('does not set interaction span context on fetch when no interaction has occurred', () => {
    initTelemetry()

    window.fetch('/test')

    expect(mockSetSpan).not.toHaveBeenCalled()
    expect(mockContextWith).not.toHaveBeenCalled()
  })

  it('prevents span creation for clicks on the BODY element', () => {
    initTelemetry()

    const mockSpan = { updateName: jest.fn(), setAttribute: jest.fn() }
    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    const result = userInteractionArgs.shouldPreventSpanCreation('click', { tagName: 'BODY' }, mockSpan)

    expect(result).toBe(true)
    expect(mockSpan.updateName).not.toHaveBeenCalled()
    expect(mockSetActiveSpan).not.toHaveBeenCalled()
  })

  it('does not store interaction span for non-click events via UserInteractionInstrumentation', () => {
    initTelemetry()

    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    const mockSpan = { spanContext: () => ({ traceId: 'xyz', spanId: '789' }) }
    userInteractionArgs.shouldPreventSpanCreation('keydown', {}, mockSpan)

    window.fetch('/test')

    expect(mockSetSpan).not.toHaveBeenCalled()
    expect(mockContextWith).not.toHaveBeenCalled()
  })

  it('sets interaction span as active context on fetch after a click', () => {
    initTelemetry()

    const mockSpan = { spanContext: () => ({ traceId: 'abc', spanId: 'def' }), updateName: jest.fn() }
    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    const result = userInteractionArgs.shouldPreventSpanCreation('click', {}, mockSpan)
    expect(result).toBe(false)

    window.fetch('/test')

    expect(mockSetSpan).toHaveBeenCalledWith(expect.any(Object), mockSpan)
    expect(mockContextWith).toHaveBeenCalledWith(
      { _span: mockSpan },
      expect.any(Function),
    )
  })

  it('calls setActiveSpan with the interaction span for logger context', () => {
    initTelemetry()

    const mockSpan = { spanContext: () => ({ traceId: 'abc', spanId: 'def' }), updateName: jest.fn() }
    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    userInteractionArgs.shouldPreventSpanCreation('click', {}, mockSpan)

    expect(mockSetActiveSpan).toHaveBeenCalledWith(mockSpan)
  })

  it('sets target_test_id attribute when clicked element has data-testid', () => {
    initTelemetry()

    const mockSpan = {
      spanContext: () => ({ traceId: 'abc', spanId: 'def' }),
      setAttribute: jest.fn(),
      updateName: jest.fn(),
    }
    const mockElement = {
      textContent: 'Confirm',
      closest: jest.fn(selector =>
        selector === '[data-testid]'
          ? { getAttribute: () => 'confirm-draft' }
          : null
      ),
    }

    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    userInteractionArgs.shouldPreventSpanCreation('click', mockElement, mockSpan)

    expect(mockSpan.setAttribute).toHaveBeenCalledWith('target_test_id', 'confirm-draft')
  })

  it('sets target_slot attribute when clicked element has data-slot', () => {
    initTelemetry()

    const mockSpan = {
      spanContext: () => ({ traceId: 'abc', spanId: 'def' }),
      setAttribute: jest.fn(),
      updateName: jest.fn(),
    }
    const mockElement = {
      textContent: 'Submit',
      closest: jest.fn(selector =>
        selector === '[data-slot]'
          ? { getAttribute: () => 'button' }
          : null
      ),
    }

    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    userInteractionArgs.shouldPreventSpanCreation('click', mockElement, mockSpan)

    expect(mockSpan.setAttribute).toHaveBeenCalledWith('target_slot', 'button')
  })

  it('does not set target attributes when no ancestor has data-testid or data-slot', () => {
    initTelemetry()

    const mockSpan = {
      spanContext: () => ({ traceId: 'abc', spanId: 'def' }),
      setAttribute: jest.fn(),
      updateName: jest.fn(),
    }
    const mockElement = {
      textContent: 'Click me',
      closest: jest.fn(() => null),
    }

    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    userInteractionArgs.shouldPreventSpanCreation('click', mockElement, mockSpan)

    expect(mockSpan.setAttribute).not.toHaveBeenCalled()
  })

  it('does not set target_test_id for non-click events', () => {
    initTelemetry()

    const mockSpan = {
      spanContext: () => ({ traceId: 'abc', spanId: 'def' }),
      setAttribute: jest.fn(),
      updateName: jest.fn(),
    }
    const mockElement = {
      closest: jest.fn(() => ({ getAttribute: () => 'some-id' })),
    }

    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    userInteractionArgs.shouldPreventSpanCreation('keydown', mockElement, mockSpan)

    expect(mockSpan.setAttribute).not.toHaveBeenCalled()
  })

  it('updates click span name with element textContent', () => {
    initTelemetry()

    const mockSpan = {
      spanContext: () => ({ traceId: 'abc', spanId: 'def' }),
      setAttribute: jest.fn(),
      updateName: jest.fn(),
    }
    const mockElement = {
      textContent: 'Confirm Draft',
      closest: jest.fn(() => null),
    }

    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    userInteractionArgs.shouldPreventSpanCreation('click', mockElement, mockSpan)

    expect(mockSpan.updateName).toHaveBeenCalledWith('Click: Confirm Draft')
  })

  it('falls back to placeholder when textContent is empty', () => {
    initTelemetry()

    const mockSpan = {
      spanContext: () => ({ traceId: 'abc', spanId: 'def' }),
      setAttribute: jest.fn(),
      updateName: jest.fn(),
    }
    const mockElement = {
      textContent: '',
      closest: jest.fn(selector =>
        selector === '[placeholder]'
          ? { getAttribute: () => 'Type here...' }
          : null
      ),
    }

    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    userInteractionArgs.shouldPreventSpanCreation('click', mockElement, mockSpan)

    expect(mockSpan.updateName).toHaveBeenCalledWith('Click: Type here...')
  })

  it('falls back to aria-label when textContent and placeholder are empty', () => {
    initTelemetry()

    const mockSpan = {
      spanContext: () => ({ traceId: 'abc', spanId: 'def' }),
      setAttribute: jest.fn(),
      updateName: jest.fn(),
    }
    const mockElement = {
      textContent: '',
      closest: jest.fn(selector =>
        selector === '[aria-label]'
          ? { getAttribute: () => 'Close dialog' }
          : null
      ),
    }

    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    userInteractionArgs.shouldPreventSpanCreation('click', mockElement, mockSpan)

    expect(mockSpan.updateName).toHaveBeenCalledWith('Click: Close dialog')
  })

  it('falls back to aria-description when textContent and aria-label are empty', () => {
    initTelemetry()

    const mockSpan = {
      spanContext: () => ({ traceId: 'abc', spanId: 'def' }),
      setAttribute: jest.fn(),
      updateName: jest.fn(),
    }
    const mockElement = {
      textContent: '',
      closest: jest.fn(selector =>
        selector === '[aria-description]'
          ? { getAttribute: () => 'Navigate back' }
          : null
      ),
    }

    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    userInteractionArgs.shouldPreventSpanCreation('click', mockElement, mockSpan)

    expect(mockSpan.updateName).toHaveBeenCalledWith('Click: Navigate back')
  })

  it('does not update span name when no label is available', () => {
    initTelemetry()

    const mockSpan = {
      spanContext: () => ({ traceId: 'abc', spanId: 'def' }),
      setAttribute: jest.fn(),
      updateName: jest.fn(),
    }
    const mockElement = {
      textContent: '',
      closest: jest.fn(() => null),
    }

    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    userInteractionArgs.shouldPreventSpanCreation('click', mockElement, mockSpan)

    expect(mockSpan.updateName).not.toHaveBeenCalled()
  })

  it('truncates long labels to 20 characters', () => {
    initTelemetry()

    const mockSpan = {
      spanContext: () => ({ traceId: 'abc', spanId: 'def' }),
      setAttribute: jest.fn(),
      updateName: jest.fn(),
    }
    const mockElement = {
      textContent: 'This is a very long button label that should be truncated',
      closest: jest.fn(() => null),
    }

    const userInteractionArgs = mockUserInteractionInstrumentation.mock.calls[0][0]
    userInteractionArgs.shouldPreventSpanCreation('click', mockElement, mockSpan)

    expect(mockSpan.updateName).toHaveBeenCalledWith('Click: This is a very long ')
  })

  it('enables FetchInstrumentation with the provider', () => {
    initTelemetry()

    expect(mockFetchSetTracerProvider).toHaveBeenCalled()
    expect(mockFetchEnable).toHaveBeenCalled()
  })

  it('enables DocumentLoadInstrumentation with the provider', () => {
    initTelemetry()

    expect(mockDocLoadSetTracerProvider).toHaveBeenCalled()
    expect(mockDocLoadEnable).toHaveBeenCalled()
  })

  it('enables UserInteractionInstrumentation with the provider', () => {
    initTelemetry()

    expect(mockUserInteractionSetTracerProvider).toHaveBeenCalled()
    expect(mockUserInteractionEnable).toHaveBeenCalled()
  })

  it('calls initLogger after provider registration', () => {
    initTelemetry()

    expect(mockInitLogger).toHaveBeenCalled()
  })

  it('calls initWebVitals after provider initialization', () => {
    initTelemetry()

    expect(mockInitWebVitals).toHaveBeenCalled()
  })

  it('returns the provider instance', () => {
    const provider = initTelemetry()

    expect(provider).toBeDefined()
    expect(provider.register).toBeDefined()
  })

  it('returns null and skips setup when otelExporterUrl is not configured', () => {
    const config = require('./config/index.js').default
    const original = config.otelExporterUrl
    config.otelExporterUrl = undefined

    const provider = initTelemetry()

    expect(provider).toBeNull()
    expect(mockOTLPTraceExporter).not.toHaveBeenCalled()
    expect(mockWebTracerProvider).not.toHaveBeenCalled()

    config.otelExporterUrl = original
  })

  it('creates a span on keydown when element has matching data-keydown', () => {
    initTelemetry()

    const element = document.createElement('input')
    element.setAttribute('data-keydown', 'Enter')
    document.body.appendChild(element)

    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    expect(mockGetTracer).toHaveBeenCalledWith('legaldoc-ai-web')
    expect(mockStartSpan).toHaveBeenCalledWith('Keydown: Enter')

    document.body.removeChild(element)
  })

  it('sets interaction span for fetch after keydown on data-keydown element', () => {
    initTelemetry()

    const element = document.createElement('input')
    element.setAttribute('data-keydown', 'Enter')
    document.body.appendChild(element)

    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    window.fetch('/test')

    const keydownSpan = mockStartSpan.mock.results[0].value
    expect(mockSetSpan).toHaveBeenCalledWith(expect.any(Object), keydownSpan)
    expect(mockContextWith).toHaveBeenCalledWith(
      { _span: keydownSpan },
      expect.any(Function),
    )

    document.body.removeChild(element)
  })

  it('calls setActiveSpan after keydown on data-keydown element', () => {
    initTelemetry()

    const element = document.createElement('input')
    element.setAttribute('data-keydown', 'Enter')
    document.body.appendChild(element)

    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    const keydownSpan = mockStartSpan.mock.results[0].value
    expect(mockSetActiveSpan).toHaveBeenCalledWith(keydownSpan)

    document.body.removeChild(element)
  })

  it('does not create a span on keydown when key does not match data-keydown', () => {
    initTelemetry()

    const element = document.createElement('input')
    element.setAttribute('data-keydown', 'Enter')
    document.body.appendChild(element)

    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))

    expect(mockStartSpan).not.toHaveBeenCalled()

    document.body.removeChild(element)
  })

  it('does not create a span on keydown when element has no data-keydown', () => {
    initTelemetry()

    const element = document.createElement('input')
    document.body.appendChild(element)

    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    expect(mockStartSpan).not.toHaveBeenCalled()

    document.body.removeChild(element)
  })

  it('sets target_test_id on keydown span from ancestor data-testid', () => {
    initTelemetry()

    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-testid', 'assistant-input')
    const element = document.createElement('input')
    element.setAttribute('data-keydown', 'Enter')
    wrapper.appendChild(element)
    document.body.appendChild(wrapper)

    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    const keydownSpan = mockStartSpan.mock.results[0].value
    expect(keydownSpan.setAttribute).toHaveBeenCalledWith('target_test_id', 'assistant-input')

    document.body.removeChild(wrapper)
  })

  it('ends the keydown span asynchronously via queueMicrotask', async () => {
    initTelemetry()

    const element = document.createElement('input')
    element.setAttribute('data-keydown', 'Enter')
    document.body.appendChild(element)

    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    const keydownSpan = mockStartSpan.mock.results[0].value
    expect(keydownSpan.end).not.toHaveBeenCalled()

    await Promise.resolve()

    expect(keydownSpan.end).toHaveBeenCalled()

    document.body.removeChild(element)
  })

  it('creates a span on pointerdown when target is inside a select-trigger', () => {
    initTelemetry()

    const trigger = document.createElement('button')
    trigger.setAttribute('data-slot', 'select-trigger')
    trigger.textContent = 'Most Recent'
    document.body.appendChild(trigger)

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    expect(mockGetTracer).toHaveBeenCalledWith('legaldoc-ai-web')
    expect(mockStartSpan).toHaveBeenCalledWith('Pointerdown: Most Recent')

    document.body.removeChild(trigger)
  })

  it('creates a span on pointerdown when target is inside a select-item', () => {
    initTelemetry()

    const item = document.createElement('div')
    item.setAttribute('data-slot', 'select-item')
    item.textContent = 'Contract'
    document.body.appendChild(item)

    item.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    expect(mockStartSpan).toHaveBeenCalledWith('Pointerdown: Contract')

    document.body.removeChild(item)
  })

  it('sets interaction span for fetch after pointerdown on select-trigger', () => {
    initTelemetry()

    const trigger = document.createElement('button')
    trigger.setAttribute('data-slot', 'select-trigger')
    trigger.textContent = 'Sort'
    document.body.appendChild(trigger)

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    window.fetch('/test')

    const pointerdownSpan = mockStartSpan.mock.results[0].value
    expect(mockSetSpan).toHaveBeenCalledWith(expect.any(Object), pointerdownSpan)
    expect(mockContextWith).toHaveBeenCalledWith(
      { _span: pointerdownSpan },
      expect.any(Function),
    )

    document.body.removeChild(trigger)
  })

  it('calls setActiveSpan after pointerdown on select-trigger', () => {
    initTelemetry()

    const trigger = document.createElement('button')
    trigger.setAttribute('data-slot', 'select-trigger')
    trigger.textContent = 'Filter'
    document.body.appendChild(trigger)

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    const pointerdownSpan = mockStartSpan.mock.results[0].value
    expect(mockSetActiveSpan).toHaveBeenCalledWith(pointerdownSpan)

    document.body.removeChild(trigger)
  })

  it('does not create a span on pointerdown when target has no select slot', () => {
    initTelemetry()

    const button = document.createElement('button')
    button.textContent = 'Submit'
    document.body.appendChild(button)

    button.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    expect(mockStartSpan).not.toHaveBeenCalled()

    document.body.removeChild(button)
  })

  it('sets target_test_id on pointerdown span from ancestor data-testid', () => {
    initTelemetry()

    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-testid', 'sort-select')
    const trigger = document.createElement('button')
    trigger.setAttribute('data-slot', 'select-trigger')
    trigger.textContent = 'Sort'
    wrapper.appendChild(trigger)
    document.body.appendChild(wrapper)

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    const pointerdownSpan = mockStartSpan.mock.results[0].value
    expect(pointerdownSpan.setAttribute).toHaveBeenCalledWith('target_test_id', 'sort-select')

    document.body.removeChild(wrapper)
  })

  it('ends the pointerdown span asynchronously via queueMicrotask', async () => {
    initTelemetry()

    const trigger = document.createElement('button')
    trigger.setAttribute('data-slot', 'select-trigger')
    trigger.textContent = 'Sort'
    document.body.appendChild(trigger)

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    const pointerdownSpan = mockStartSpan.mock.results[0].value
    expect(pointerdownSpan.end).not.toHaveBeenCalled()

    await Promise.resolve()

    expect(pointerdownSpan.end).toHaveBeenCalled()

    document.body.removeChild(trigger)
  })
})
