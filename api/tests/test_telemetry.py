"""Tests for api.core.telemetry module."""

import json
import logging
from unittest.mock import MagicMock, patch

from opentelemetry.trace import StatusCode

from api.core.config import Settings
from api.core.telemetry import (
    _SERVICE_NAME,
    _SERVICE_VERSION,
    JSONFormatter,
    SpanErrorHandler,
    _build_resource,
    get_tracer,
    instrument_app,
    setup_telemetry,
)


class TestJSONFormatter:
    """Tests for the JSONFormatter log formatter."""

    def test_format_includes_trace_context(self):
        """JSONFormatter should include otelTraceID and otelSpanID in output."""
        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="hello",
            args=None,
            exc_info=None,
        )
        record.otelTraceID = "abc123"
        record.otelSpanID = "def456"

        result = json.loads(formatter.format(record))

        assert result["otelTraceID"] == "abc123"
        assert result["otelSpanID"] == "def456"

    def test_format_defaults_trace_ids_to_zero(self):
        """JSONFormatter should default trace and span IDs to '0'."""
        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="test.logger",
            level=logging.WARNING,
            pathname="test.py",
            lineno=1,
            msg="no trace",
            args=None,
            exc_info=None,
        )

        result = json.loads(formatter.format(record))

        assert result["otelTraceID"] == "0"
        assert result["otelSpanID"] == "0"

    def test_format_includes_level_and_message(self):
        """JSONFormatter should include the log level and message."""
        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="app",
            level=logging.ERROR,
            pathname="test.py",
            lineno=1,
            msg="something failed",
            args=None,
            exc_info=None,
        )

        result = json.loads(formatter.format(record))

        assert result["level"] == "ERROR"
        assert result["message"] == "something failed"

    def test_format_includes_logger_name(self):
        """JSONFormatter should include the logger name."""
        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="my.module",
            level=logging.DEBUG,
            pathname="test.py",
            lineno=1,
            msg="debug msg",
            args=None,
            exc_info=None,
        )

        result = json.loads(formatter.format(record))

        assert result["logger"] == "my.module"

    def test_format_includes_iso_timestamp(self):
        """JSONFormatter should include an ISO-formatted UTC timestamp."""
        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="ts check",
            args=None,
            exc_info=None,
        )

        result = json.loads(formatter.format(record))

        assert "timestamp" in result
        assert result["timestamp"].endswith("+00:00")


class TestBuildResource:
    """Tests for the _build_resource helper."""

    def test_resource_has_service_name(self):
        """_build_resource should set service.name attribute."""
        resource = _build_resource()
        assert resource.attributes["service.name"] == _SERVICE_NAME

    def test_resource_has_service_version(self):
        """_build_resource should set service.version attribute."""
        resource = _build_resource()
        assert resource.attributes["service.version"] == _SERVICE_VERSION


@patch(
    "api.core.telemetry.get_settings",
    return_value=Settings(otel_exporter_endpoint="http://otel-collector:4317"),
)
class TestSetupTelemetry:
    """Tests for the setup_telemetry function."""

    @patch("api.core.telemetry.logging.getLogger")
    @patch("api.core.telemetry.logging.StreamHandler")
    @patch("api.core.telemetry.LoggingInstrumentor")
    @patch("api.core.telemetry.PymongoInstrumentor")
    @patch("api.core.telemetry._logs.set_logger_provider")
    @patch("api.core.telemetry.BatchLogRecordProcessor")
    @patch("api.core.telemetry.LoggerProvider")
    @patch("api.core.telemetry.OTLPLogExporter")
    @patch("api.core.telemetry.set_meter_provider")
    @patch("api.core.telemetry.PeriodicExportingMetricReader")
    @patch("api.core.telemetry.MeterProvider")
    @patch("api.core.telemetry.OTLPMetricExporter")
    @patch("api.core.telemetry.trace.set_tracer_provider")
    @patch("api.core.telemetry.BatchSpanProcessor")
    @patch("api.core.telemetry.TracerProvider")
    @patch("api.core.telemetry.OTLPSpanExporter")
    @patch("api.core.telemetry._build_resource")
    def test_configures_tracer_provider(
        self,
        mock_resource,
        mock_span_exporter,
        mock_tracer_provider_cls,
        mock_batch_span,
        mock_set_tracer,
        mock_metric_exporter,
        mock_meter_provider_cls,
        mock_metric_reader,
        mock_set_meter,
        mock_log_exporter,
        mock_logger_provider_cls,
        mock_batch_log,
        mock_set_logger,
        mock_pymongo,
        mock_logging_inst,
        mock_stream_handler,
        mock_get_logger,
        mock_get_settings,
    ):
        """setup_telemetry should create a TracerProvider with OTLP exporter."""
        settings = mock_get_settings.return_value

        setup_telemetry()

        mock_span_exporter.assert_called_once_with(
            endpoint=settings.otel_exporter_endpoint, insecure=True
        )
        mock_tracer_provider_cls.assert_called_once_with(
            resource=mock_resource.return_value
        )
        mock_batch_span.assert_called_once_with(mock_span_exporter.return_value)
        mock_tracer_provider_cls.return_value.add_span_processor.assert_called_once_with(
            mock_batch_span.return_value
        )
        mock_set_tracer.assert_called_once_with(
            mock_tracer_provider_cls.return_value
        )

    @patch("api.core.telemetry.logging.getLogger")
    @patch("api.core.telemetry.logging.StreamHandler")
    @patch("api.core.telemetry.LoggingInstrumentor")
    @patch("api.core.telemetry.PymongoInstrumentor")
    @patch("api.core.telemetry._logs.set_logger_provider")
    @patch("api.core.telemetry.BatchLogRecordProcessor")
    @patch("api.core.telemetry.LoggerProvider")
    @patch("api.core.telemetry.OTLPLogExporter")
    @patch("api.core.telemetry.set_meter_provider")
    @patch("api.core.telemetry.PeriodicExportingMetricReader")
    @patch("api.core.telemetry.MeterProvider")
    @patch("api.core.telemetry.OTLPMetricExporter")
    @patch("api.core.telemetry.trace.set_tracer_provider")
    @patch("api.core.telemetry.BatchSpanProcessor")
    @patch("api.core.telemetry.TracerProvider")
    @patch("api.core.telemetry.OTLPSpanExporter")
    @patch("api.core.telemetry._build_resource")
    def test_configures_meter_provider(
        self,
        mock_resource,
        mock_span_exporter,
        mock_tracer_provider_cls,
        mock_batch_span,
        mock_set_tracer,
        mock_metric_exporter,
        mock_meter_provider_cls,
        mock_metric_reader,
        mock_set_meter,
        mock_log_exporter,
        mock_logger_provider_cls,
        mock_batch_log,
        mock_set_logger,
        mock_pymongo,
        mock_logging_inst,
        mock_stream_handler,
        mock_get_logger,
        mock_get_settings,
    ):
        """setup_telemetry should create a MeterProvider with OTLP exporter."""
        settings = mock_get_settings.return_value

        setup_telemetry()

        mock_metric_exporter.assert_called_once_with(
            endpoint=settings.otel_exporter_endpoint, insecure=True
        )
        mock_metric_reader.assert_called_once_with(
            mock_metric_exporter.return_value
        )
        mock_meter_provider_cls.assert_called_once_with(
            resource=mock_resource.return_value,
            metric_readers=[mock_metric_reader.return_value],
        )
        mock_set_meter.assert_called_once_with(
            mock_meter_provider_cls.return_value
        )

    @patch("api.core.telemetry.logging.getLogger")
    @patch("api.core.telemetry.logging.StreamHandler")
    @patch("api.core.telemetry.LoggingInstrumentor")
    @patch("api.core.telemetry.PymongoInstrumentor")
    @patch("api.core.telemetry._logs.set_logger_provider")
    @patch("api.core.telemetry.BatchLogRecordProcessor")
    @patch("api.core.telemetry.LoggerProvider")
    @patch("api.core.telemetry.OTLPLogExporter")
    @patch("api.core.telemetry.set_meter_provider")
    @patch("api.core.telemetry.PeriodicExportingMetricReader")
    @patch("api.core.telemetry.MeterProvider")
    @patch("api.core.telemetry.OTLPMetricExporter")
    @patch("api.core.telemetry.trace.set_tracer_provider")
    @patch("api.core.telemetry.BatchSpanProcessor")
    @patch("api.core.telemetry.TracerProvider")
    @patch("api.core.telemetry.OTLPSpanExporter")
    @patch("api.core.telemetry._build_resource")
    def test_configures_logger_provider(
        self,
        mock_resource,
        mock_span_exporter,
        mock_tracer_provider_cls,
        mock_batch_span,
        mock_set_tracer,
        mock_metric_exporter,
        mock_meter_provider_cls,
        mock_metric_reader,
        mock_set_meter,
        mock_log_exporter,
        mock_logger_provider_cls,
        mock_batch_log,
        mock_set_logger,
        mock_pymongo,
        mock_logging_inst,
        mock_stream_handler,
        mock_get_logger,
        mock_get_settings,
    ):
        """setup_telemetry should create a LoggerProvider with OTLP exporter."""
        settings = mock_get_settings.return_value

        setup_telemetry()

        mock_log_exporter.assert_called_once_with(
            endpoint=settings.otel_exporter_endpoint, insecure=True
        )
        mock_logger_provider_cls.assert_called_once_with(
            resource=mock_resource.return_value
        )
        mock_batch_log.assert_called_once_with(mock_log_exporter.return_value)
        mock_logger_provider_cls.return_value.add_log_record_processor.assert_called_once_with(
            mock_batch_log.return_value
        )
        mock_set_logger.assert_called_once_with(
            mock_logger_provider_cls.return_value
        )

    @patch("api.core.telemetry.logging.getLogger")
    @patch("api.core.telemetry.logging.StreamHandler")
    @patch("api.core.telemetry.LoggingInstrumentor")
    @patch("api.core.telemetry.PymongoInstrumentor")
    @patch("api.core.telemetry._logs.set_logger_provider")
    @patch("api.core.telemetry.BatchLogRecordProcessor")
    @patch("api.core.telemetry.LoggerProvider")
    @patch("api.core.telemetry.OTLPLogExporter")
    @patch("api.core.telemetry.set_meter_provider")
    @patch("api.core.telemetry.PeriodicExportingMetricReader")
    @patch("api.core.telemetry.MeterProvider")
    @patch("api.core.telemetry.OTLPMetricExporter")
    @patch("api.core.telemetry.trace.set_tracer_provider")
    @patch("api.core.telemetry.BatchSpanProcessor")
    @patch("api.core.telemetry.TracerProvider")
    @patch("api.core.telemetry.OTLPSpanExporter")
    @patch("api.core.telemetry._build_resource")
    def test_instruments_pymongo(
        self,
        mock_resource,
        mock_span_exporter,
        mock_tracer_provider_cls,
        mock_batch_span,
        mock_set_tracer,
        mock_metric_exporter,
        mock_meter_provider_cls,
        mock_metric_reader,
        mock_set_meter,
        mock_log_exporter,
        mock_logger_provider_cls,
        mock_batch_log,
        mock_set_logger,
        mock_pymongo,
        mock_logging_inst,
        mock_stream_handler,
        mock_get_logger,
        mock_get_settings,
    ):
        """setup_telemetry should instrument pymongo."""
        setup_telemetry()

        mock_pymongo.return_value.instrument.assert_called_once()

    @patch("api.core.telemetry.logging.getLogger")
    @patch("api.core.telemetry.logging.StreamHandler")
    @patch("api.core.telemetry.LoggingInstrumentor")
    @patch("api.core.telemetry.PymongoInstrumentor")
    @patch("api.core.telemetry._logs.set_logger_provider")
    @patch("api.core.telemetry.BatchLogRecordProcessor")
    @patch("api.core.telemetry.LoggerProvider")
    @patch("api.core.telemetry.OTLPLogExporter")
    @patch("api.core.telemetry.set_meter_provider")
    @patch("api.core.telemetry.PeriodicExportingMetricReader")
    @patch("api.core.telemetry.MeterProvider")
    @patch("api.core.telemetry.OTLPMetricExporter")
    @patch("api.core.telemetry.trace.set_tracer_provider")
    @patch("api.core.telemetry.BatchSpanProcessor")
    @patch("api.core.telemetry.TracerProvider")
    @patch("api.core.telemetry.OTLPSpanExporter")
    @patch("api.core.telemetry._build_resource")
    def test_instruments_logging(
        self,
        mock_resource,
        mock_span_exporter,
        mock_tracer_provider_cls,
        mock_batch_span,
        mock_set_tracer,
        mock_metric_exporter,
        mock_meter_provider_cls,
        mock_metric_reader,
        mock_set_meter,
        mock_log_exporter,
        mock_logger_provider_cls,
        mock_batch_log,
        mock_set_logger,
        mock_pymongo,
        mock_logging_inst,
        mock_stream_handler,
        mock_get_logger,
        mock_get_settings,
    ):
        """setup_telemetry should instrument stdlib logging."""
        setup_telemetry()

        mock_logging_inst.return_value.instrument.assert_called_once()

    @patch("api.core.telemetry.logging.getLogger")
    @patch("api.core.telemetry.logging.StreamHandler")
    @patch("api.core.telemetry.LoggingInstrumentor")
    @patch("api.core.telemetry.PymongoInstrumentor")
    @patch("api.core.telemetry._logs.set_logger_provider")
    @patch("api.core.telemetry.BatchLogRecordProcessor")
    @patch("api.core.telemetry.LoggerProvider")
    @patch("api.core.telemetry.OTLPLogExporter")
    @patch("api.core.telemetry.set_meter_provider")
    @patch("api.core.telemetry.PeriodicExportingMetricReader")
    @patch("api.core.telemetry.MeterProvider")
    @patch("api.core.telemetry.OTLPMetricExporter")
    @patch("api.core.telemetry.trace.set_tracer_provider")
    @patch("api.core.telemetry.BatchSpanProcessor")
    @patch("api.core.telemetry.TracerProvider")
    @patch("api.core.telemetry.OTLPSpanExporter")
    @patch("api.core.telemetry._build_resource")
    def test_attaches_json_formatter_to_root_logger(
        self,
        mock_resource,
        mock_span_exporter,
        mock_tracer_provider_cls,
        mock_batch_span,
        mock_set_tracer,
        mock_metric_exporter,
        mock_meter_provider_cls,
        mock_metric_reader,
        mock_set_meter,
        mock_log_exporter,
        mock_logger_provider_cls,
        mock_batch_log,
        mock_set_logger,
        mock_pymongo,
        mock_logging_inst,
        mock_stream_handler,
        mock_get_logger,
        mock_get_settings,
    ):
        """setup_telemetry should attach a JSONFormatter to the root logger."""
        setup_telemetry()

        mock_handler = mock_stream_handler.return_value
        mock_handler.setFormatter.assert_called_once()
        formatter = mock_handler.setFormatter.call_args[0][0]
        assert isinstance(formatter, JSONFormatter)
        add_handler_calls = mock_get_logger.return_value.addHandler.call_args_list
        assert add_handler_calls[0] == ((mock_handler,),)
        assert isinstance(add_handler_calls[1][0][0], SpanErrorHandler)


    def test_skips_setup_when_endpoint_is_empty(self, mock_get_settings):
        """setup_telemetry should return without configuring providers
        when endpoint is empty."""
        mock_get_settings.return_value = Settings(otel_exporter_endpoint="")

        with patch("api.core.telemetry.OTLPSpanExporter") as mock_span_exporter:
            setup_telemetry()

            mock_span_exporter.assert_not_called()


class TestInstrumentApp:
    """Tests for the instrument_app function."""

    @patch("api.core.telemetry.FastAPIInstrumentor")
    def test_instruments_fastapi_app(self, mock_fastapi_inst):
        """instrument_app should call FastAPIInstrumentor.instrument_app."""
        app = MagicMock()

        instrument_app(app)

        mock_fastapi_inst.instrument_app.assert_called_once_with(app)


class TestSpanErrorHandler:
    """Tests for the SpanErrorHandler log handler."""

    @patch("api.core.telemetry.trace.get_current_span")
    def test_records_exception_from_exc_info(self, mock_get_span):
        """SpanErrorHandler should record_exception when exc_info is present."""
        mock_span = MagicMock()
        mock_get_span.return_value = mock_span
        handler = SpanErrorHandler()
        exc = RuntimeError("db timeout")
        record = logging.LogRecord(
            name="test", level=logging.ERROR, pathname="", lineno=0,
            msg="something failed", args=None, exc_info=(type(exc), exc, None),
        )

        handler.emit(record)

        mock_span.record_exception.assert_called_once_with(exc)
        status = mock_span.set_status.call_args[0][0]
        assert status.status_code == StatusCode.ERROR
        assert status.description == "something failed"

    @patch("api.core.telemetry.trace.get_current_span")
    def test_sets_error_status_without_exc_info(self, mock_get_span):
        """SpanErrorHandler should set error status even without exc_info."""
        mock_span = MagicMock()
        mock_get_span.return_value = mock_span
        handler = SpanErrorHandler()
        record = logging.LogRecord(
            name="test", level=logging.ERROR, pathname="", lineno=0,
            msg="manual error", args=None, exc_info=None,
        )

        handler.emit(record)

        mock_span.record_exception.assert_not_called()
        status = mock_span.set_status.call_args[0][0]
        assert status.status_code == StatusCode.ERROR
        assert status.description == "manual error"

    @patch("api.core.telemetry.trace.get_current_span")
    def test_ignores_warning_level(self, mock_get_span):
        """SpanErrorHandler should not affect span for WARNING logs."""
        mock_span = MagicMock()
        mock_get_span.return_value = mock_span
        handler = SpanErrorHandler()
        handler.setLevel(logging.ERROR)
        record = logging.LogRecord(
            name="test", level=logging.WARNING, pathname="", lineno=0,
            msg="just a warning", args=None, exc_info=None,
        )

        handler.handle(record)

        mock_span.record_exception.assert_not_called()
        mock_span.set_status.assert_not_called()


class TestGetTracer:
    """Tests for the get_tracer function."""

    @patch("api.core.telemetry.trace.get_tracer")
    def test_returns_tracer_by_name(self, mock_get_tracer):
        """get_tracer should delegate to trace.get_tracer with the name."""
        result = get_tracer("my.module")

        mock_get_tracer.assert_called_once_with("my.module")
        assert result == mock_get_tracer.return_value
