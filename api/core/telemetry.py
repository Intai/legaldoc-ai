"""OpenTelemetry setup for traces, metrics, and logs."""

import json
import logging
from datetime import datetime, timezone

from opentelemetry import _logs, trace
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.instrumentation.pymongo import PymongoInstrumentor
from opentelemetry.metrics import set_meter_provider
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Status, StatusCode

from api.core.config import get_settings

_SERVICE_NAME = "legaldoc-ai-api"
_SERVICE_VERSION = "0.1.0"


class SpanErrorHandler(logging.Handler):
    """Log handler that records ERROR+ logs on the current OpenTelemetry span."""

    def emit(self, record: logging.LogRecord) -> None:
        """Record exception and error status on the active span."""
        if record.levelno < logging.ERROR:
            return
        span = trace.get_current_span()
        if record.exc_info and record.exc_info[1]:
            span.record_exception(record.exc_info[1])
        span.set_status(Status(StatusCode.ERROR, record.getMessage()))


class JSONFormatter(logging.Formatter):
    """Structured JSON log formatter with OpenTelemetry trace context."""

    def format(self, record: logging.LogRecord) -> str:
        """Format a log record as a JSON string with trace context."""
        log_entry = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "otelTraceID": getattr(record, "otelTraceID", "0"),
            "otelSpanID": getattr(record, "otelSpanID", "0"),
        }
        return json.dumps(log_entry)


def _build_resource() -> Resource:
    """Build a shared OpenTelemetry resource."""
    return Resource.create(
        {
            "service.name": _SERVICE_NAME,
            "service.version": _SERVICE_VERSION,
        }
    )


def setup_telemetry() -> None:
    """Initialise OpenTelemetry providers for traces, metrics, and logs.

    Configures TracerProvider, MeterProvider, and LoggerProvider with
    OTLP gRPC exporters. Instruments pymongo and stdlib logging.
    """
    settings = get_settings()
    endpoint = settings.otel_exporter_endpoint
    if not endpoint:
        return
    resource = _build_resource()

    # Traces
    span_exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_exporter = OTLPMetricExporter(endpoint=endpoint, insecure=True)
    metric_reader = PeriodicExportingMetricReader(metric_exporter)
    meter_provider = MeterProvider(
        resource=resource, metric_readers=[metric_reader]
    )
    set_meter_provider(meter_provider)

    # Logs
    log_exporter = OTLPLogExporter(endpoint=endpoint, insecure=True)
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(log_exporter)
    )
    _logs.set_logger_provider(logger_provider)

    # Instrument pymongo and stdlib logging
    PymongoInstrumentor().instrument()
    LoggingInstrumentor().instrument()

    # Attach JSON formatter and span error handler to the root logger
    root_logger = logging.getLogger()
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)
    span_error_handler = SpanErrorHandler()
    span_error_handler.setLevel(logging.ERROR)
    root_logger.addHandler(span_error_handler)


def instrument_app(app) -> None:
    """Apply FastAPI instrumentation to the given application."""
    FastAPIInstrumentor.instrument_app(app)


def get_tracer(name: str) -> trace.Tracer:
    """Return a tracer from the global TracerProvider."""
    return trace.get_tracer(name)
