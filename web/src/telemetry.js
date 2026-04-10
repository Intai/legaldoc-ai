import { context, trace } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchSpanProcessor, StackContextManager, WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import config from './config/index.js'
import { initLogger, setActiveSpan } from './logger.js'
import { initWebVitals } from './web-vitals.js'

// Tracks the most recent interaction span so subsequent fetch calls
// can be linked to the user interaction that triggered them.
let lastInteractionSpan = null

const initTelemetry = () => {
  // Skip telemetry when no OTel collector is available (e.g. running
  // docker-compose.yml without docker-compose.signoz.yml).
  if (!config.otelExporterUrl) {
    return null
  }

  // Send traces to the OTel collector via HTTP/JSON.
  const exporter = new OTLPTraceExporter({
    url: `${config.otelExporterUrl}/v1/traces`,
  })

  // Create a tracer provider that identifies this service and batches
  // spans before exporting to reduce network overhead.
  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'legaldoc-ai-web',
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
  })

  provider.register({
    contextManager: new StackContextManager(),
  })

  // Auto-instrument fetch requests. Trace headers are propagated to
  // the API so backend spans join the same trace. Requests to the
  // OTel collector itself are excluded to avoid recursive tracing.
  const fetchInstrumentation = new FetchInstrumentation({
    propagateTraceHeaderCorsUrls: [new RegExp(config.apiBaseUrl)],
    ignoreUrls: [new RegExp(config.otelExporterUrl)],
  })
  fetchInstrumentation.setTracerProvider(provider)
  fetchInstrumentation.enable()

  // Wrap window.fetch so that every call runs inside the context of
  // the last click span. This links API requests to the UI click
  // that caused them, producing connected traces in the backend.
  const instrumentedFetch = window.fetch
  window.fetch = (...args) => {
    if (lastInteractionSpan) {
      const ctx = trace.setSpan(context.active(), lastInteractionSpan)
      return context.with(ctx, () => instrumentedFetch(...args))
    }
    return instrumentedFetch(...args)
  }

  // Capture page-load performance timing (navigationStart, domComplete, etc.).
  const documentLoadInstrumentation = new DocumentLoadInstrumentation()
  documentLoadInstrumentation.setTracerProvider(provider)
  documentLoadInstrumentation.enable()

  // Derive a human-readable label from the element's text content,
  // falling back to placeholder, aria-label, then aria-description.
  const labelOf = element =>
    element.textContent?.trim()
    || element.closest?.('[placeholder]')?.getAttribute('placeholder')
    || element.closest?.('[aria-label]')?.getAttribute('aria-label')
    || element.closest?.('[aria-description]')?.getAttribute('aria-description')
    || ''

  // Tag a span with data-testid / data-slot from the nearest ancestor,
  // making traces easy to correlate with UI elements.
  const tagSpan = (element, span) => {
    const testIdElement = element.closest?.('[data-testid]')
    if (testIdElement) {
      span.setAttribute('target_test_id', testIdElement.getAttribute('data-testid'))
    }
    const slotElement = element.closest?.('[data-slot]')
    if (slotElement) {
      span.setAttribute('target_slot', slotElement.getAttribute('data-slot'))
    }
  }

  // Track user clicks. shouldPreventSpanCreation is called for every
  // interaction — returning false keeps the span. We store the click
  // span so fetch calls can be parented to it.
  const userInteractionInstrumentation = new UserInteractionInstrumentation({
    shouldPreventSpanCreation: (eventType, element, span) => {
      if (eventType === 'click') {
        if (['BODY', 'MAIN'].includes(element.tagName)) return true
        const label = labelOf(element)
        if (label) {
          span.updateName(`Click: ${label.substring(0, 20)}`)
        }
        lastInteractionSpan = span
        setActiveSpan(span)
        tagSpan(element, span)
      }
      return false
    },
  })
  userInteractionInstrumentation.setTracerProvider(provider)
  userInteractionInstrumentation.enable()

  // Capture keydown events on elements that opt in via data-keydown.
  // Uses the capture phase so the span is created before the event
  // bubbles to component handlers that may trigger fetch calls.
  document.addEventListener('keydown', e => {
    const trigger = e.target.closest?.('[data-keydown]')
    if (!trigger || trigger.getAttribute('data-keydown') !== e.key) return

    const tracer = trace.getTracer('legaldoc-ai-web')
    const span = tracer.startSpan(`Keydown: ${e.key}`)
    tagSpan(trigger, span)

    lastInteractionSpan = span
    setActiveSpan(span)
    queueMicrotask(() => span.end())
  }, true)

  // Radix UI Select opens the dropdown on pointerdown and removes
  // the portal on selection — both happen before a click event can
  // fire. Capture pointerdown on select slots so these interactions
  // still produce trace spans.
  document.addEventListener('pointerdown', e => {
    const slot = e.target.closest?.('[data-slot="select-trigger"], [data-slot="select-item"]')
    if (!slot) return

    const tracer = trace.getTracer('legaldoc-ai-web')
    const label = labelOf(slot)
    const span = tracer.startSpan(`Pointerdown: ${label.substring(0, 20)}`)
    tagSpan(slot, span)

    lastInteractionSpan = span
    setActiveSpan(span)
    queueMicrotask(() => span.end())
  }, true)

  // Initialize the logger pipeline so application code can emit
  // structured logs to the OTel collector alongside traces.
  initLogger()

  // Report Core Web Vitals (LCP, CLS, INP, etc.) as trace events.
  initWebVitals()

  return provider
}

export { initTelemetry }
