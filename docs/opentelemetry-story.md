As a developer, I want to add SigNoz observability with OpenTelemetry so that I can monitor distributed traces, browser interactions, and Web Vitals across the full stack.

## Requirements

- Add self-hosted SigNoz stack (ClickHouse, OTel Collector, query service, frontend UI) as a separate Docker Compose file.
- Update Makefile dev commands to include the SigNoz compose file.
- Instrument FastAPI with OpenTelemetry auto-instrumentation for HTTP request traces and MongoDB query spans.
- Add structured JSON logging with trace/span ID correlation to the API.
- Add a `@traced_node` decorator to create OpenTelemetry spans for each LangGraph node execution.
- Apply the `@traced_node` decorator to all 9 LangGraph nodes (analyze, structure, draft, finalize, ingest, retrieve_vector, retrieve_sparql, rerank, answer).
- Instrument the React frontend with OpenTelemetry fetch auto-instrumentation that propagates W3C `traceparent` headers to the API.
- Add user interaction instrumentation to capture click, input, and submit events as spans.
- Report Web Vitals (LCP, INP, CLS, TTFB, FCP) as trace spans with value and rating attributes.
- Update CORS configuration to allow `traceparent` and `tracestate` headers.
- Existing LangSmith integration must continue working.

## Tasks

**Parallel tasks 1-6:**

1. Use backend-developer subagent to create the SigNoz Docker Compose file @docker-compose.signoz.yml. Define 7 services: zookeeper (`bitnami/zookeeper:3.7.1`), clickhouse (`clickhouse/clickhouse-server:25.8.21-alpine`), otel-collector-migrator-sync and otel-collector-migrator-async (`signoz/signoz-schema-migrator:v0.144.2`), otel-collector (`signoz/signoz-otel-collector:v0.144.2` on ports 4317, 4318), query-service (`signoz/query-service:0.76.2`), frontend (`signoz/frontend:0.75.0` on port 3301). Add `clickhouse_data` and `signoz_data` volumes. Copy required config files from the SigNoz repo into a @signoz/ directory (clickhouse config XMLs, otel-collector-config.yaml, prometheus.yml, nginx config). Reference the official SigNoz `deploy/docker/clickhouse-setup/docker-compose-minimal.yaml`.
2. Use backend-developer subagent to add OpenTelemetry dependencies to @api/pyproject.toml. Add `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-exporter-otlp`, `opentelemetry-instrumentation-fastapi`, `opentelemetry-instrumentation-pymongo`, `opentelemetry-instrumentation-logging`.
3. Use backend-developer subagent to add `opentelemetry-api` to @langraph/pyproject.toml dependencies.
4. Use backend-developer subagent to add `OTEL_EXPORTER_ENDPOINT` env var to the api service @docker-compose.yml. Add `OTEL_EXPORTER_ENDPOINT=http://otel-collector:4317` and `VITE_OTEL_EXPORTER_URL=http://localhost:4318` to @.env.example.
5. Use backend-developer subagent to update Makefile dev commands @Makefile. Change `make dev`, `make dev-bg`, and `make dev-stop` to use `docker compose -f docker-compose.yml -f docker-compose.signoz.yml`.
6. Use qa-tester subagent to plan BDD scenarios @web/src/documents/docs/opentelemetry.feature.

**Sequential tasks 7-9 after task 2 completes:**

7. Use backend-developer subagent to add `otel_exporter_endpoint: str = "http://otel-collector:4317"` field to the Settings class @api/core/config.py. Follow the existing pydantic-settings pattern.
8. Use backend-developer subagent to create the telemetry module @api/core/telemetry.py. Implement `setup_telemetry()` to initialize `TracerProvider`, `MeterProvider`, and `LoggerProvider` with OTLP gRPC exporters using `settings.otel_exporter_endpoint`. Set resource attributes `service.name=legaldoc-ai-api`, `service.version=0.1.0`. Run `PymongoInstrumentor().instrument()` and `LoggingInstrumentor().instrument()`. Add a `JSONFormatter` that includes `otelTraceID` and `otelSpanID` in structured log output. Implement `instrument_app(app)` to apply `FastAPIInstrumentor.instrument_app(app)`. Export a `get_tracer(name)` convenience function.
9. Use backend-developer subagent to wire telemetry into the FastAPI app @api/main.py. Call `setup_telemetry()` at module level before `create_app()`. Call `instrument_app(app)` at the end of `create_app()` after routes and middleware are added. Add `traceparent` and `tracestate` to the CORS `allow_headers` list.

**Sequential tasks 10-11 after task 3 completes:**

10. Use backend-developer subagent to create the `@traced_node` decorator @langraph/services/tracing.py. Use `opentelemetry.trace.get_tracer("langraph.nodes")`. The decorator wraps an async node function with `start_as_current_span(f"langraph.node.{name}")` and sets attributes `langraph.node.name` and `langraph.graph`.
11. Use backend-developer subagent to apply `@traced_node` decorator to all 9 LangGraph nodes. Add `from langraph.services.tracing import traced_node` and the decorator to @langraph/nodes/analyze_node.py (`@traced_node("analyze")`), @langraph/nodes/structure_node.py (`@traced_node("structure")`), @langraph/nodes/draft_node.py (`@traced_node("draft")`), @langraph/nodes/finalize_node.py (`@traced_node("finalize")`), @langraph/nodes/ingest_node.py (`@traced_node("ingest")`), @langraph/nodes/retrieve_vector_node.py (`@traced_node("retrieve_vector")`), @langraph/nodes/retrieve_sparql_node.py (`@traced_node("retrieve_sparql")`), @langraph/nodes/rerank_node.py (`@traced_node("rerank")`), @langraph/nodes/answer_node.py (`@traced_node("answer")`).

**Sequential tasks 12-14:**

12. Use frontend-developer subagent to add OpenTelemetry browser and Web Vitals dependencies to @web/package.json. Add `@opentelemetry/api`, `@opentelemetry/sdk-trace-web`, `@opentelemetry/instrumentation-fetch`, `@opentelemetry/instrumentation-document-load`, `@opentelemetry/instrumentation-user-interaction`, `@opentelemetry/context-zone`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, and `web-vitals`.
13. Use frontend-developer subagent to create the browser telemetry module @web/src/telemetry.js. Initialize `WebTracerProvider` with `OTLPTraceExporter` pointing to `VITE_OTEL_EXPORTER_URL` (default `http://localhost:4318`). Register `FetchInstrumentation` with `propagateTraceHeaderCorsUrls` matching the API base URL. Register `DocumentLoadInstrumentation` and `UserInteractionInstrumentation`. Use `ZoneContextManager`. Set resource `service.name=legaldoc-ai-web`. Reference the existing config pattern in @web/src/config/default.js for the exporter URL. Also create the Web Vitals reporter @web/src/web-vitals.js. Import `onLCP`, `onINP`, `onCLS`, `onTTFB`, `onFCP` from `web-vitals`. For each metric callback, create a trace span named `web-vital.{metric.name}` with attributes `web_vital.name`, `web_vital.value`, `web_vital.rating`, `web_vital.navigation_type`. Export an `initWebVitals()` function called from @web/src/telemetry.js after the provider is initialized. Follow the SigNoz traces approach per their docs.
14. Use frontend-developer subagent to wire browser telemetry at the entry point @web/src/index.jsx. Add `import './telemetry.js'` as the first import line (before React) so instrumentation is active before any fetch calls.
