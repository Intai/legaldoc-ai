import importlib
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.middleware.cors import CORSMiddleware

import api.main
from api.main import create_app

mock_vector_store_module = MagicMock()


@pytest.fixture
def app():
    """Create a test app instance."""
    with (
        patch("api.main.get_settings") as mock_settings,
        patch("api.main.instrument_app") as _mock_instrument,
    ):
        mock_settings.return_value.app_title = "LegalDoc AI API"
        mock_settings.return_value.cors_origins = ["http://localhost:8080"]
        yield create_app()


class TestAppCreation:
    """Tests for FastAPI application setup."""

    def test_app_title(self, app):
        """Test that the app is created with the correct title."""
        assert app.title == "LegalDoc AI API"

    def test_cors_middleware_configured(self, app):
        """Test that CORS middleware is added to the app."""
        assert CORSMiddleware in [m.cls for m in app.user_middleware]

    def test_cors_allows_traceparent_header(self, app):
        """Test that CORS allow_headers includes traceparent."""
        cors_mw = next(m for m in app.user_middleware if m.cls is CORSMiddleware)
        assert "traceparent" in cors_mw.kwargs["allow_headers"]

    def test_cors_allows_tracestate_header(self, app):
        """Test that CORS allow_headers includes tracestate."""
        cors_mw = next(m for m in app.user_middleware if m.cls is CORSMiddleware)
        assert "tracestate" in cors_mw.kwargs["allow_headers"]

    def test_v1_router_mounted(self, app):
        """Test that the v1 router is mounted at /api/v1."""
        route_paths = [route.path for route in app.routes]
        assert any(path.startswith("/api/v1") for path in route_paths)


class TestTelemetry:
    """Tests for OpenTelemetry integration."""

    def test_setup_telemetry_called_at_module_level(self):
        """Test that setup_telemetry is called when the module is imported."""
        with (
            patch("api.core.telemetry.setup_telemetry") as mock_setup,
            patch("api.core.telemetry.instrument_app"),
        ):
            importlib.reload(api.main)
            mock_setup.assert_called_once()

    def test_instrument_app_called_in_create_app(self):
        """Test that instrument_app is called at the end of create_app."""
        with (
            patch("api.main.get_settings") as mock_settings,
            patch("api.main.instrument_app") as mock_instrument,
        ):
            mock_settings.return_value.app_title = "Test"
            mock_settings.return_value.cors_origins = []
            app = create_app()
            mock_instrument.assert_called_once_with(app)


class TestLifespan:
    """Tests for application lifespan events."""

    @pytest.mark.asyncio
    async def test_lifespan_calls_init_db(self):
        """Test that the lifespan initialises the database and logs it."""
        with (
            patch("api.main.init_db", new_callable=AsyncMock) as mock_init_db,
            patch("api.main.instrument_app"),
            patch("api.main.logger") as mock_logger,
            patch.dict(
                sys.modules,
                {
                    "langraph": MagicMock(),
                    "langraph.services": MagicMock(),
                    "langraph.services.vector_store": mock_vector_store_module,
                },
            ),
        ):
            app = create_app()
            async with app.router.lifespan_context(app):
                mock_init_db.assert_called_once()
                mock_logger.info.assert_any_call("Database initialised")

    @pytest.mark.asyncio
    async def test_lifespan_calls_init_collection(self):
        """Test that the lifespan initialises the vector store and logs it."""
        mock_vs = MagicMock()
        mock_services = MagicMock()
        mock_services.vector_store = mock_vs
        with (
            patch("api.main.init_db", new_callable=AsyncMock),
            patch("api.main.instrument_app"),
            patch("api.main.logger") as mock_logger,
            patch.dict(
                sys.modules,
                {
                    "langraph": MagicMock(),
                    "langraph.services": mock_services,
                    "langraph.services.vector_store": mock_vs,
                },
            ),
        ):
            app = create_app()
            async with app.router.lifespan_context(app):
                mock_vs.init_collection.assert_called_once()
                mock_logger.info.assert_any_call(
                    "Vector store collection initialised"
                )
