"""Shared pytest fixtures."""

from unittest.mock import patch

import api.core.telemetry as _tel

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
