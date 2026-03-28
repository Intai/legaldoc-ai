"""Shared pytest fixtures."""

import pytest
from beanie import init_beanie
from mongomock_motor import AsyncMongoMockClient

from api.models.document import DocumentModel


@pytest.fixture
async def beanie_db():
    """Initialize Beanie with an in-memory mock MongoDB."""
    client = AsyncMongoMockClient()
    await init_beanie(
        database=client.test_db,
        document_models=[DocumentModel],
    )
