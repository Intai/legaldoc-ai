"""Tests for Beanie document models."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from api.models.document import DocumentModel, DocumentStatus, DocumentType


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
