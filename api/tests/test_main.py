import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.middleware.cors import CORSMiddleware

from api.main import create_app

mock_vector_store_module = MagicMock()


@pytest.fixture
def app():
    """Create a test app instance."""
    with patch("api.main.get_settings") as mock_settings:
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

    def test_v1_router_mounted(self, app):
        """Test that the v1 router is mounted at /api/v1."""
        route_paths = [route.path for route in app.routes]
        assert any(path.startswith("/api/v1") for path in route_paths)


class TestLifespan:
    """Tests for application lifespan events."""

    @pytest.mark.asyncio
    async def test_lifespan_calls_init_db(self):
        """Test that the lifespan context manager initialises the database."""
        with (
            patch("api.main.init_db", new_callable=AsyncMock) as mock_init_db,
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

    @pytest.mark.asyncio
    async def test_lifespan_calls_init_collection(self):
        """Test that the lifespan initialises the vector store."""
        mock_vs = MagicMock()
        mock_services = MagicMock()
        mock_services.vector_store = mock_vs
        with (
            patch("api.main.init_db", new_callable=AsyncMock),
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
