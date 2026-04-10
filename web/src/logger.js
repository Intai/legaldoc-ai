import { context, trace } from '@opentelemetry/api'
import { logs, SeverityNumber } from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import config from './config/index.js'

let otelLogger = null
let activeSpan = null

const setActiveSpan = span => {
  activeSpan = span
}

const activeContext = () =>
  activeSpan ? trace.setSpan(context.active(), activeSpan) : undefined

const initLogger = () => {
  if (!config.otelExporterUrl) {
    return null
  }

  const exporter = new OTLPLogExporter({
    url: `${config.otelExporterUrl}/v1/logs`,
  })

  const provider = new LoggerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'legaldoc-ai-web',
    }),
    processors: [new BatchLogRecordProcessor(exporter)],
  })

  logs.setGlobalLoggerProvider(provider)
  otelLogger = logs.getLogger('legaldoc-ai-web')

  return provider
}

const debug = (message, attributes = {}) => {
  // eslint-disable-next-line no-console
  console.debug(message, attributes)
  otelLogger?.emit({
    severityNumber: SeverityNumber.DEBUG,
    severityText: 'DEBUG',
    body: message,
    attributes,
    context: activeContext(),
  })
}

const info = (message, attributes = {}) => {
  // eslint-disable-next-line no-console
  console.info(message, attributes)
  otelLogger?.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: message,
    attributes,
    context: activeContext(),
  })
}

const warn = (message, attributes = {}) => {
  console.warn(message, attributes)
  otelLogger?.emit({
    severityNumber: SeverityNumber.WARN,
    severityText: 'WARN',
    body: message,
    attributes,
    context: activeContext(),
  })
}

const error = (message, attributes = {}) => {
  console.error(message, attributes)
  otelLogger?.emit({
    severityNumber: SeverityNumber.ERROR,
    severityText: 'ERROR',
    body: message,
    attributes,
    context: activeContext(),
  })
}

export { initLogger, setActiveSpan, debug, info, warn, error }
