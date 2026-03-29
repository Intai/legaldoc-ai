"""Tests for Beanie document models."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from api.models.document import DocumentModel, DocumentStatus, DocumentType
from api.models.reference import ReferenceModel


class TestDocumentModel:
    """Tests for the DocumentModel Beanie document."""

    async def test_create_with_valid_data(self, beanie_db):
        """Test model creation with all valid fields."""
        doc = DocumentModel(
            title="Service Agreement",
            type=DocumentType.CONTRACT,
            status=DocumentStatus.DRAFT,
            description="A standard service agreement.",
            page_count=5,
        )
        assert doc.title == "Service Agreement"
        assert doc.type == DocumentType.CONTRACT
        assert doc.status == DocumentStatus.DRAFT
        assert doc.description == "A standard service agreement."
        assert doc.page_count == 5
        assert doc.pdf_content is None

    async def test_create_with_pdf_content(self, beanie_db):
        """Test model creation with pdf_content bytes."""
        pdf_bytes = b"%PDF-1.4 sample content"
        doc = DocumentModel(
            title="Policy Doc",
            type=DocumentType.POLICY,
            status=DocumentStatus.DONE,
            description="A policy with PDF.",
            page_count=10,
            pdf_content=pdf_bytes,
        )
        assert doc.pdf_content == pdf_bytes

    async def test_default_created_at(self, beanie_db):
        """Test that created_at defaults to approximately now in UTC."""
        before = datetime.now(timezone.utc)
        doc = DocumentModel(
            title="NDA",
            type=DocumentType.NDA,
            status=DocumentStatus.DONE,
            description="Non-disclosure agreement.",
            page_count=2,
        )
        after = datetime.now(timezone.utc)
        assert before <= doc.created_at <= after

    def test_invalid_type_rejected(self):
        """Test that an invalid document type raises a validation error."""
        with pytest.raises(ValidationError):
            DocumentModel(
                title="Unknown",
                type="Invoice",
                status=DocumentStatus.DRAFT,
                description="Invalid type.",
                page_count=1,
            )

    def test_invalid_status_rejected(self):
        """Test that an invalid document status raises a validation error."""
        with pytest.raises(ValidationError):
            DocumentModel(
                title="Policy Doc",
                type=DocumentType.POLICY,
                status="Archived",
                description="Invalid status.",
                page_count=3,
            )


class TestReferenceModel:
    """Tests for the ReferenceModel Beanie document."""

    async def test_create_with_valid_data(self, beanie_db):
        """Test model creation with all valid fields."""
        ref = ReferenceModel(
            title="Standard NDA Template",
            type=DocumentType.NDA,
            description="A standard non-disclosure agreement template.",
        )
        assert ref.title == "Standard NDA Template"
        assert ref.type == DocumentType.NDA
        assert ref.description == "A standard non-disclosure agreement template."

    async def test_default_created_at(self, beanie_db):
        """Test that created_at defaults to approximately now in UTC."""
        before = datetime.now(timezone.utc)
        ref = ReferenceModel(
            title="Employment Template",
            type=DocumentType.EMPLOYMENT,
            description="An employment agreement template.",
        )
        after = datetime.now(timezone.utc)
        assert before <= ref.created_at <= after

    async def test_collection_name(self, beanie_db):
        """Test that the collection is named 'references'."""
        assert ReferenceModel.Settings.name == "references"

    def test_invalid_type_rejected(self):
        """Test that an invalid document type raises a validation error."""
        with pytest.raises(ValidationError):
            ReferenceModel(
                title="Unknown",
                type="Invoice",
                description="Invalid type.",
            )
