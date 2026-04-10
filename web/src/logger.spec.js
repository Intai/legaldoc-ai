/* eslint-disable no-console */
const mockContextActive = jest.fn(() => ({}))
const mockSetSpan = jest.fn((ctx, span) => ({ _span: span }))

jest.mock('@opentelemetry/api', () => ({
  context: { active: mockContextActive },
  trace: { setSpan: mockSetSpan },
}), { virtual: true })

const mockEmit = jest.fn()
const mockGetLogger = jest.fn(() => ({ emit: mockEmit }))
const mockSetGlobalLoggerProvider = jest.fn()

jest.mock('@opentelemetry/api-logs', () => ({
  logs: {
    setGlobalLoggerProvider: mockSetGlobalLoggerProvider,
    getLogger: mockGetLogger,
  },
  SeverityNumber: {
    DEBUG: 5,
    INFO: 9,
    WARN: 13,
    ERROR: 17,
  },
}), { virtual: true })

const mockOTLPLogExporter = jest.fn()

jest.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: mockOTLPLogExporter,
}), { virtual: true })

const mockResourceFromAttributes = jest.fn(() => ({ 'service.name': 'legaldoc-ai-web' }))

jest.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: mockResourceFromAttributes,
}), { virtual: true })

const mockBatchLogRecordProcessor = jest.fn()
const mockLoggerProvider = jest.fn()

jest.mock('@opentelemetry/sdk-logs', () => ({
  LoggerProvider: mockLoggerProvider,
  BatchLogRecordProcessor: mockBatchLogRecordProcessor,
}), { virtual: true })

jest.mock('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
}), { virtual: true })

jest.mock('./config/index.js', () => ({
  default: {
    otelExporterUrl: 'http://localhost:4318',
  },
  __esModule: true,
}))

jest.spyOn(console, 'debug').mockImplementation(() => {})
jest.spyOn(console, 'info').mockImplementation(() => {})
jest.spyOn(console, 'warn').mockImplementation(() => {})
jest.spyOn(console, 'error').mockImplementation(() => {})

const { initLogger, setActiveSpan, debug, info, warn, error } = require('./logger.js')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('initLogger', () => {
  it('creates an OTLPLogExporter with the /v1/logs URL', () => {
    initLogger()

    expect(mockOTLPLogExporter).toHaveBeenCalledWith({
      url: 'http://localhost:4318/v1/logs',
    })
  })

  it('creates a LoggerProvider with the service name and batch processor', () => {
    initLogger()

    expect(mockResourceFromAttributes).toHaveBeenCalledWith({
      'service.name': 'legaldoc-ai-web',
    })
    expect(mockBatchLogRecordProcessor).toHaveBeenCalledWith(expect.any(Object))
    expect(mockLoggerProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: expect.any(Object),
        processors: expect.arrayContaining([expect.any(Object)]),
      })
    )
  })

  it('registers the global logger provider', () => {
    initLogger()

    expect(mockSetGlobalLoggerProvider).toHaveBeenCalledWith(expect.any(Object))
  })

  it('gets a logger with the service name', () => {
    initLogger()

    expect(mockGetLogger).toHaveBeenCalledWith('legaldoc-ai-web')
  })

  it('returns the provider instance', () => {
    const provider = initLogger()

    expect(provider).toBeDefined()
  })

  it('returns null and skips setup when otelExporterUrl is not configured', () => {
    const config = require('./config/index.js').default
    const original = config.otelExporterUrl
    config.otelExporterUrl = ''

    const provider = initLogger()

    expect(provider).toBeNull()
    expect(mockOTLPLogExporter).not.toHaveBeenCalled()
    expect(mockLoggerProvider).not.toHaveBeenCalled()

    config.otelExporterUrl = original
  })
})

describe('debug', () => {
  beforeEach(() => {
    initLogger()
    jest.clearAllMocks()
  })

  it('calls console.debug with message and attributes', () => {
    debug('test message', { key: 'value' })

    expect(console.debug).toHaveBeenCalledWith('test message', { key: 'value' })
  })

  it('emits an OTel log record with DEBUG severity', () => {
    debug('test message', { key: 'value' })

    expect(mockEmit).toHaveBeenCalledWith({
      severityNumber: 5,
      severityText: 'DEBUG',
      body: 'test message',
      attributes: { key: 'value' },
      context: undefined,
    })
  })

  it('defaults attributes to empty object when omitted', () => {
    debug('test message')

    expect(console.debug).toHaveBeenCalledWith('test message', {})
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: {} })
    )
  })
})

describe('info', () => {
  beforeEach(() => {
    initLogger()
    jest.clearAllMocks()
  })

  it('calls console.info with message and attributes', () => {
    info('test message', { key: 'value' })

    expect(console.info).toHaveBeenCalledWith('test message', { key: 'value' })
  })

  it('emits an OTel log record with INFO severity', () => {
    info('test message', { key: 'value' })

    expect(mockEmit).toHaveBeenCalledWith({
      severityNumber: 9,
      severityText: 'INFO',
      body: 'test message',
      attributes: { key: 'value' },
      context: undefined,
    })
  })

  it('defaults attributes to empty object when omitted', () => {
    info('test message')

    expect(console.info).toHaveBeenCalledWith('test message', {})
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: {} })
    )
  })
})

describe('warn', () => {
  beforeEach(() => {
    initLogger()
    jest.clearAllMocks()
  })

  it('calls console.warn with message and attributes', () => {
    warn('test message', { key: 'value' })

    expect(console.warn).toHaveBeenCalledWith('test message', { key: 'value' })
  })

  it('emits an OTel log record with WARN severity', () => {
    warn('test message', { key: 'value' })

    expect(mockEmit).toHaveBeenCalledWith({
      severityNumber: 13,
      severityText: 'WARN',
      body: 'test message',
      attributes: { key: 'value' },
      context: undefined,
    })
  })

  it('defaults attributes to empty object when omitted', () => {
    warn('test message')

    expect(console.warn).toHaveBeenCalledWith('test message', {})
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: {} })
    )
  })
})

describe('error', () => {
  beforeEach(() => {
    initLogger()
    jest.clearAllMocks()
  })

  it('calls console.error with message and attributes', () => {
    error('test message', { key: 'value' })

    expect(console.error).toHaveBeenCalledWith('test message', { key: 'value' })
  })

  it('emits an OTel log record with ERROR severity', () => {
    error('test message', { key: 'value' })

    expect(mockEmit).toHaveBeenCalledWith({
      severityNumber: 17,
      severityText: 'ERROR',
      body: 'test message',
      attributes: { key: 'value' },
      context: undefined,
    })
  })

  it('defaults attributes to empty object when omitted', () => {
    error('test message')

    expect(console.error).toHaveBeenCalledWith('test message', {})
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: {} })
    )
  })
})

describe('setActiveSpan', () => {
  beforeEach(() => {
    initLogger()
    jest.clearAllMocks()
  })

  it('attaches span context to emitted log records', () => {
    const mockSpan = { spanContext: () => ({ traceId: 'abc', spanId: 'def' }) }
    setActiveSpan(mockSpan)

    info('test message', { key: 'value' })

    expect(mockSetSpan).toHaveBeenCalledWith({}, mockSpan)
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ context: { _span: mockSpan } })
    )
  })

  it('clears span context when called with null', () => {
    const mockSpan = { spanContext: () => ({ traceId: 'abc', spanId: 'def' }) }
    setActiveSpan(mockSpan)
    setActiveSpan(null)

    info('test message')

    expect(mockSetSpan).not.toHaveBeenCalled()
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ context: undefined })
    )
  })
})

describe('when initLogger has not been called', () => {
  it('debug calls console but does not emit to OTel', () => {
    jest.isolateModules(() => {
      const { debug: d } = require('./logger.js')
      d('msg')
      expect(console.debug).toHaveBeenCalledWith('msg', {})
      expect(mockEmit).not.toHaveBeenCalled()
    })
  })

  it('info calls console but does not emit to OTel', () => {
    jest.isolateModules(() => {
      const { info: i } = require('./logger.js')
      i('msg')
      expect(console.info).toHaveBeenCalledWith('msg', {})
      expect(mockEmit).not.toHaveBeenCalled()
    })
  })

  it('warn calls console but does not emit to OTel', () => {
    jest.isolateModules(() => {
      const { warn: w } = require('./logger.js')
      w('msg')
      expect(console.warn).toHaveBeenCalledWith('msg', {})
      expect(mockEmit).not.toHaveBeenCalled()
    })
  })

  it('error calls console but does not emit to OTel', () => {
    jest.isolateModules(() => {
      const { error: e } = require('./logger.js')
      e('msg')
      expect(console.error).toHaveBeenCalledWith('msg', {})
      expect(mockEmit).not.toHaveBeenCalled()
    })
  })
})
