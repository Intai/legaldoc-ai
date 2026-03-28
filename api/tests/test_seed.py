"""Tests for the database seed script."""

from unittest.mock import AsyncMock, patch

import pytest

from api.db.seed import SAMPLE_DOCUMENTS, seed
from api.models.document import DocumentStatus, DocumentType


class TestSampleDocuments:
    """Validate the seed data list."""

    def test_has_enough_records_for_pagination(self):
        """Sample documents should contain 12+ items to exceed one page."""
        assert len(SAMPLE_DOCUMENTS) >= 12

    def test_covers_all_document_types(self):
        """Every DocumentType value should appear in the sample data."""
        types_in_samples = {doc["type"] for doc in SAMPLE_DOCUMENTS}
        for doc_type in DocumentType:
            assert doc_type in types_in_samples, f"Missing type: {doc_type}"

    def test_covers_all_document_statuses(self):
        """Every DocumentStatus value should appear in the sample data."""
        statuses_in_samples = {doc["status"] for doc in SAMPLE_DOCUMENTS}
        for status in DocumentStatus:
            assert status in statuses_in_samples, f"Missing status: {status}"


class TestSeedFunction:
    """Validate the seed function orchestration."""

    @pytest.mark.asyncio
    @patch("api.db.seed.DocumentModel")
    @patch("api.db.seed.init_beanie", new_callable=AsyncMock)
    @patch("api.db.seed.AsyncIOMotorClient")
    async def test_seed_deletes_then_inserts(
        self, mock_client, mock_init_beanie, mock_model
    ):
        """Seed should delete existing documents and insert sample ones."""
        mock_delete = AsyncMock()
        mock_find_all = AsyncMock()
        mock_find_all.delete = mock_delete
        mock_model.find_all.return_value = mock_find_all
        mock_model.insert_many = AsyncMock()

        await seed()

        mock_model.find_all.assert_called_once()
        mock_delete.assert_awaited_once()
        mock_model.insert_many.assert_awaited_once()
        inserted = mock_model.insert_many.call_args[0][0]
        assert len(inserted) == len(SAMPLE_DOCUMENTS)

    @pytest.mark.asyncio
    @patch("api.db.seed.DocumentModel")
    @patch("api.db.seed.init_beanie", new_callable=AsyncMock)
    @patch("api.db.seed.AsyncIOMotorClient")
    async def test_seed_initialises_beanie(
        self, mock_client, mock_init_beanie, mock_model
    ):
        """Seed should initialise Beanie with the DocumentModel."""
        mock_delete = AsyncMock()
        mock_find_all = AsyncMock()
        mock_find_all.delete = mock_delete
        mock_model.find_all.return_value = mock_find_all
        mock_model.insert_many = AsyncMock()

        await seed()

        mock_init_beanie.assert_awaited_once()
