"""Tests for the database seed script."""

import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.modules["langraph"] = MagicMock()
sys.modules["langraph.services"] = MagicMock()
sys.modules["langraph.services.vector_store"] = MagicMock()

from api.db.seed import (  # noqa: E402
    LEGAL_CONTENT,
    SAMPLE_DOCUMENTS,
    SAMPLE_REFERENCES,
    SIGNOZ_DATABASES,
    clear_clickhouse,
    generate_pdf,
    seed,
)
from api.models.document import DocumentStatus, DocumentType  # noqa: E402


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

    def test_every_document_has_pdf_content(self):
        """Every sample document should have generated PDF bytes."""
        for doc in SAMPLE_DOCUMENTS:
            assert doc.get("pdf_content") is not None, (
                f"Missing pdf_content for: {doc['title']}"
            )
            assert isinstance(doc["pdf_content"], bytes)
            assert doc["pdf_content"][:5] == b"%PDF-"

    def test_legal_content_exists_for_all_titles(self):
        """Every sample document title should have a matching legal content entry."""
        for doc in SAMPLE_DOCUMENTS:
            assert doc["title"] in LEGAL_CONTENT, (
                f"Missing legal content for: {doc['title']}"
            )


class TestSampleReferences:
    """Validate the reference seed data list."""

    def test_has_five_reference_documents(self):
        """Sample references should contain exactly 5 items."""
        assert len(SAMPLE_REFERENCES) == 5

    def test_includes_nda_template(self):
        """References should include the NDA Template document."""
        titles = {ref["title"] for ref in SAMPLE_REFERENCES}
        assert "NDA Template" in titles

    def test_includes_service_agreement(self):
        """References should include the Service Agreement document."""
        titles = {ref["title"] for ref in SAMPLE_REFERENCES}
        assert "Service Agreement" in titles

    def test_includes_privacy_policy_template(self):
        """References should include the Privacy Policy Template document."""
        titles = {ref["title"] for ref in SAMPLE_REFERENCES}
        assert "Privacy Policy Template" in titles

    def test_includes_employment_handbook(self):
        """References should include the Employment Handbook document."""
        titles = {ref["title"] for ref in SAMPLE_REFERENCES}
        assert "Employment Handbook" in titles

    def test_includes_vendor_agreement(self):
        """References should include the Vendor Agreement document."""
        titles = {ref["title"] for ref in SAMPLE_REFERENCES}
        assert "Vendor Agreement" in titles

    def test_reference_types_match_expected(self):
        """Each reference should have the correct DocumentType."""
        type_by_title = {ref["title"]: ref["type"] for ref in SAMPLE_REFERENCES}
        assert type_by_title["NDA Template"] == DocumentType.CONTRACT
        assert type_by_title["Service Agreement"] == DocumentType.CONTRACT
        assert type_by_title["Privacy Policy Template"] == DocumentType.POLICY
        assert type_by_title["Employment Handbook"] == DocumentType.EMPLOYMENT
        assert type_by_title["Vendor Agreement"] == DocumentType.CONTRACT

    def test_every_reference_has_description(self):
        """Every reference should have a non-empty description."""
        for ref in SAMPLE_REFERENCES:
            assert ref.get("description"), (
                f"Missing description for: {ref['title']}"
            )

    def test_every_reference_has_created_at(self):
        """Every reference should have a created_at timestamp."""
        for ref in SAMPLE_REFERENCES:
            assert ref.get("created_at") is not None, (
                f"Missing created_at for: {ref['title']}"
            )

    def test_every_reference_has_pdf_content(self):
        """Every seed reference should have generated PDF bytes."""
        for ref in SAMPLE_REFERENCES:
            assert ref.get("pdf_content") is not None, (
                f"Missing pdf_content for: {ref['title']}"
            )
            assert isinstance(ref["pdf_content"], bytes)
            assert ref["pdf_content"][:5] == b"%PDF-"

    def test_legal_content_exists_for_all_reference_titles(self):
        """Every reference title should have a matching legal content entry."""
        for ref in SAMPLE_REFERENCES:
            assert ref["title"] in LEGAL_CONTENT, (
                f"Missing legal content for: {ref['title']}"
            )


class TestGeneratePdf:
    """Validate the PDF generation helper."""

    def test_generates_valid_pdf_bytes(self):
        """generate_pdf should return bytes starting with the PDF header."""
        result = generate_pdf("Test Title", ["HEADING", "Body paragraph."])
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"

    def test_empty_paragraphs_produces_valid_pdf(self):
        """generate_pdf with empty paragraphs should still produce a valid PDF."""
        result = generate_pdf("Empty", [])
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"


class TestSeedFunction:
    """Validate the seed function orchestration."""

    @pytest.mark.asyncio
    @patch("api.db.seed.clear_clickhouse")
    @patch("api.db.seed.vector_store")
    @patch("api.db.seed.ReferenceModel")
    @patch("api.db.seed.DocumentModel")
    @patch("api.db.seed.init_beanie", new_callable=AsyncMock)
    @patch("api.db.seed.AsyncIOMotorClient")
    async def test_seed_deletes_then_inserts_documents(
        self,
        mock_client,
        mock_init_beanie,
        mock_doc_model,
        mock_ref_model,
        mock_vector_store,
        _mock_clear_clickhouse,
    ):
        """Seed should delete existing documents and insert sample ones."""
        mock_doc_delete = AsyncMock()
        mock_doc_find_all = AsyncMock()
        mock_doc_find_all.delete = mock_doc_delete
        mock_doc_model.find_all.return_value = mock_doc_find_all
        mock_doc_model.insert_many = AsyncMock()

        mock_ref_delete = AsyncMock()
        mock_ref_find_all = AsyncMock()
        mock_ref_find_all.delete = mock_ref_delete
        mock_ref_model.find_all.return_value = mock_ref_find_all
        mock_ref_model.insert_many = AsyncMock()

        await seed()

        mock_doc_model.find_all.assert_called_once()
        mock_doc_delete.assert_awaited_once()
        mock_doc_model.insert_many.assert_awaited_once()
        inserted_docs = mock_doc_model.insert_many.call_args[0][0]
        assert len(inserted_docs) == len(SAMPLE_DOCUMENTS)

    @pytest.mark.asyncio
    @patch("api.db.seed.clear_clickhouse")
    @patch("api.db.seed.vector_store")
    @patch("api.db.seed.ReferenceModel")
    @patch("api.db.seed.DocumentModel")
    @patch("api.db.seed.init_beanie", new_callable=AsyncMock)
    @patch("api.db.seed.AsyncIOMotorClient")
    async def test_seed_deletes_then_inserts_references(
        self,
        mock_client,
        mock_init_beanie,
        mock_doc_model,
        mock_ref_model,
        mock_vector_store,
        _mock_clear_clickhouse,
    ):
        """Seed should delete existing references and insert sample ones."""
        mock_doc_delete = AsyncMock()
        mock_doc_find_all = AsyncMock()
        mock_doc_find_all.delete = mock_doc_delete
        mock_doc_model.find_all.return_value = mock_doc_find_all
        mock_doc_model.insert_many = AsyncMock()

        mock_ref_delete = AsyncMock()
        mock_ref_find_all = AsyncMock()
        mock_ref_find_all.delete = mock_ref_delete
        mock_ref_model.find_all.return_value = mock_ref_find_all
        mock_ref_model.insert_many = AsyncMock()

        await seed()

        mock_ref_model.find_all.assert_called_once()
        mock_ref_delete.assert_awaited_once()
        mock_ref_model.insert_many.assert_awaited_once()
        inserted_refs = mock_ref_model.insert_many.call_args[0][0]
        assert len(inserted_refs) == len(SAMPLE_REFERENCES)

    @pytest.mark.asyncio
    @patch("api.db.seed.clear_clickhouse")
    @patch("api.db.seed.vector_store")
    @patch("api.db.seed.ReferenceModel")
    @patch("api.db.seed.DocumentModel")
    @patch("api.db.seed.init_beanie", new_callable=AsyncMock)
    @patch("api.db.seed.AsyncIOMotorClient")
    async def test_seed_initialises_beanie_with_both_models(
        self,
        mock_client,
        mock_init_beanie,
        mock_doc_model,
        mock_ref_model,
        mock_vector_store,
        _mock_clear_clickhouse,
    ):
        """Seed should initialise Beanie with DocumentModel and ReferenceModel."""
        mock_doc_delete = AsyncMock()
        mock_doc_find_all = AsyncMock()
        mock_doc_find_all.delete = mock_doc_delete
        mock_doc_model.find_all.return_value = mock_doc_find_all
        mock_doc_model.insert_many = AsyncMock()

        mock_ref_delete = AsyncMock()
        mock_ref_find_all = AsyncMock()
        mock_ref_find_all.delete = mock_ref_delete
        mock_ref_model.find_all.return_value = mock_ref_find_all
        mock_ref_model.insert_many = AsyncMock()

        await seed()

        mock_init_beanie.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("api.db.seed.clear_clickhouse")
    @patch("api.db.seed.vector_store")
    @patch("api.db.seed.ReferenceModel")
    @patch("api.db.seed.DocumentModel")
    @patch("api.db.seed.init_beanie", new_callable=AsyncMock)
    @patch("api.db.seed.AsyncIOMotorClient")
    async def test_seed_clears_vector_store(
        self,
        mock_client,
        mock_init_beanie,
        mock_doc_model,
        mock_ref_model,
        mock_vector_store,
        _mock_clear_clickhouse,
    ):
        """Seed should clear the Qdrant vector store collection."""
        mock_doc_delete = AsyncMock()
        mock_doc_find_all = AsyncMock()
        mock_doc_find_all.delete = mock_doc_delete
        mock_doc_model.find_all.return_value = mock_doc_find_all
        mock_doc_model.insert_many = AsyncMock()

        mock_ref_delete = AsyncMock()
        mock_ref_find_all = AsyncMock()
        mock_ref_find_all.delete = mock_ref_delete
        mock_ref_model.find_all.return_value = mock_ref_find_all
        mock_ref_model.insert_many = AsyncMock()

        await seed()

        mock_vector_store.clear_collection.assert_called_once()


class TestClearClickhouse:
    """Validate the ClickHouse telemetry cleanup."""

    @patch("api.db.seed.clickhouse_connect")
    def test_truncates_all_tables_in_signoz_databases(self, mock_ch):
        """clear_clickhouse should truncate every table in each SigNoz database."""
        mock_client = MagicMock()
        mock_ch.get_client.return_value = mock_client
        mock_client.query.return_value.result_rows = [
            ("spans",),
            ("traces",),
        ]

        settings = MagicMock()
        settings.clickhouse_host = "clickhouse"
        settings.clickhouse_port = 8123
        settings.clickhouse_password = ""

        clear_clickhouse(settings)

        assert mock_client.query.call_count == len(SIGNOZ_DATABASES)
        assert mock_client.command.call_count == len(SIGNOZ_DATABASES) * 2

        for db in SIGNOZ_DATABASES:
            mock_client.query.assert_any_call(f"SHOW TABLES FROM {db}")
            mock_client.command.assert_any_call(f"TRUNCATE TABLE {db}.spans")
            mock_client.command.assert_any_call(f"TRUNCATE TABLE {db}.traces")

    @patch("api.db.seed.clickhouse_connect")
    def test_skips_gracefully_when_clickhouse_unavailable(self, mock_ch):
        """clear_clickhouse should not raise when ClickHouse is unreachable."""
        mock_ch.get_client.side_effect = Exception("Connection refused")

        settings = MagicMock()
        settings.clickhouse_host = "clickhouse"
        settings.clickhouse_port = 8123
        settings.clickhouse_password = ""

        clear_clickhouse(settings)  # Should not raise
