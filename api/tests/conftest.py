"""Shared pytest fixtures."""

import sys
import types
from unittest.mock import MagicMock, patch

# Pre-seed sys.modules with a mock mcp package so importing api.core.mcp
# does not require the real mcp SDK (which may not be installed in tests).
if "mcp" not in sys.modules:
    sys.modules["mcp"] = types.ModuleType("mcp")
if "mcp.server" not in sys.modules:
    sys.modules["mcp.server"] = types.ModuleType("mcp.server")
if "mcp.server.fastmcp" not in sys.modules:
    _mock_fastmcp = types.ModuleType("mcp.server.fastmcp")

    class _StubFastMCP:
        """Minimal stand-in for FastMCP when the real SDK is not installed."""

        def __init__(self, name: str = "", **kwargs):
            self.name = name
            self.session_manager = MagicMock()

        def tool(self):
            """Return a no-op decorator so @mcp.tool() preserves the function."""
            return lambda fn: fn

        def streamable_http_app(self):
            return MagicMock()

    _mock_fastmcp.FastMCP = _StubFastMCP  # type: ignore[attr-defined]
    sys.modules["mcp.server.fastmcp"] = _mock_fastmcp

import api.core.telemetry as _tel  # noqa: E402

# Temporarily no-op setup_telemetry so the module-level call in api.main
# does not spawn real OTLP exporters that try to reach otel-collector.
_original = _tel.setup_telemetry
_tel.setup_telemetry = lambda: None
import api.main  # noqa: F401, E402, I001
_tel.setup_telemetry = _original

import pytest  # noqa: E402
from beanie import init_beanie  # noqa: E402
from mongomock_motor import AsyncMongoMockClient  # noqa: E402

from api.core.config import get_settings  # noqa: E402
from api.models.document import DocumentModel  # noqa: E402
from api.models.reference import ReferenceModel  # noqa: E402


@pytest.fixture(autouse=True)
def _clear_env():
    """Prevent environment variables from leaking into unit tests."""
    with patch.dict("os.environ", {}, clear=True):
        get_settings.cache_clear()
        yield


@pytest.fixture
async def beanie_db():
    """Initialize Beanie with an in-memory mock MongoDB."""
    client = AsyncMongoMockClient()
    await init_beanie(
        database=client.test_db,
        document_models=[DocumentModel, ReferenceModel],
    )
