from datetime import timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson.codec_options import CodecOptions
from mcp.server.fastmcp import FastMCP

from api.core.config import Settings
from api.core.mcp import mcp


class TestMcp:
    """Tests for the MCP server instance."""

    def test_mcp_is_fastmcp_instance(self):
        """mcp should be an instance of FastMCP."""
        assert isinstance(mcp, FastMCP)

    def test_mcp_name(self):
        """mcp should be named 'legaldoc-ai'."""
        assert mcp.name == "legaldoc-ai"


class TestSettings:
    """Tests for application Settings."""

    def test_loads_defaults(self):
        """Settings should load with correct default values."""
        settings = Settings()
        assert settings.app_title == "LegalDoc AI API"
        assert settings.mongodb_username == ""
        assert settings.mongodb_password == ""
        assert settings.mongodb_db_name == "legaldoc_ai"
        assert settings.mongodb_host == "mongodb"
        assert settings.mongodb_port == 27017
        assert settings.otel_exporter_endpoint == ""
        assert settings.clickhouse_host == "clickhouse"
        assert settings.clickhouse_port == 8123
        assert settings.clickhouse_password == ""

    def test_mongodb_uri(self):
        """Settings should build the MongoDB URI from its components."""
        settings = Settings(
            mongodb_username="user",
            mongodb_password="pass",
            mongodb_host="localhost",
            mongodb_port=27018,
        )
        assert settings.mongodb_uri == "mongodb://user:pass@localhost:27018"

    def test_cors_origins(self):
        """Settings should return the expected CORS origins list."""
        settings = Settings()
        assert settings.cors_origins == ["http://localhost:8080"]


class TestDependencies:
    """Tests for database dependency helpers."""

    @pytest.mark.asyncio
    @patch("api.core.dependencies.init_beanie", new_callable=AsyncMock)
    @patch("api.core.dependencies.AsyncIOMotorClient")
    async def test_init_db(self, mock_client_cls, mock_init_beanie):
        """init_db should create a motor client and initialise Beanie."""
        from api.core import dependencies
        from api.models.document import DocumentModel
        from api.models.reference import ReferenceModel

        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        settings = Settings()

        await dependencies.init_db()

        mock_client_cls.assert_called_once_with(settings.mongodb_uri)
        mock_db = mock_client[settings.mongodb_db_name]
        mock_db.with_options.assert_called_once_with(
            codec_options=CodecOptions(tz_aware=True, tzinfo=timezone.utc),
        )
        mock_init_beanie.assert_awaited_once_with(
            database=mock_db.with_options.return_value,
            document_models=[DocumentModel, ReferenceModel],
        )
        dependencies._client = None

    def test_get_database_before_init(self):
        """get_database should raise RuntimeError when DB is not initialised."""
        from api.core import dependencies

        dependencies._client = None
        with pytest.raises(RuntimeError, match="Database not initialised"):
            dependencies.get_database()

    def test_get_database_after_init(self):
        """get_database should return the database from the active client."""
        from api.core import dependencies

        mock_client = MagicMock()
        dependencies._client = mock_client
        settings = Settings()

        result = dependencies.get_database()

        mock_db = mock_client[settings.mongodb_db_name]
        mock_db.with_options.assert_called_once_with(
            codec_options=CodecOptions(tz_aware=True, tzinfo=timezone.utc),
        )
        assert result == mock_db.with_options.return_value
        dependencies._client = None
