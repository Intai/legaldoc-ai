const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  otelExporterUrl: import.meta.env.VITE_OTEL_EXPORTER_URL || '',
}

export default config
