import { trace } from '@opentelemetry/api'
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

const recordWebVital = metric => {
  const tracer = trace.getTracer('web-vitals')
  const span = tracer.startSpan(`web-vital.${metric.name}`)
  span.setAttributes({
    'web_vital.name': metric.name,
    'web_vital.value': metric.value,
    'web_vital.rating': metric.rating,
    'web_vital.navigation_type': metric.navigationType,
  })
  span.end()
}

const initWebVitals = () => {
  onLCP(recordWebVital)
  onINP(recordWebVital)
  onCLS(recordWebVital)
  onTTFB(recordWebVital)
  onFCP(recordWebVital)
}

export { initWebVitals, recordWebVital }
