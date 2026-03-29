"""Shared pytest fixtures."""

from unittest.mock import patch

import pytest
from beanie import init_beanie
from mongomock_motor import AsyncMongoMockClient

from api.core.config import get_settings
from api.models.document import DocumentModel
from api.models.reference import ReferenceModel


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
