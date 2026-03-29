"""Tests for document schema models."""

import pytest

from api.models.document import DocumentStatus
from api.schemas.common import ErrorDetail
from api.schemas.document import (
    DocumentDetailResponse,
    DocumentResponse,
    GenerateDocumentRequest,
    UpdateDocumentStatusRequest,
)


def _sample_document_response():
    """Create a sample DocumentResponse for reuse in tests."""
    return DocumentResponse(
        id="abc123",
        title="Test Doc",
        type="CONTRACT",
        status="DONE",
        description="A test document.",
        createdAt="2025-01-15T10:00:00Z",
        pageCount=3,
    )


class TestDocumentDetailResponse:
    """Tests for DocumentDetailResponse schema."""

    def test_success_envelope(self):
        """Test success response contains data and null error."""
        doc = _sample_document_response()
        resp = DocumentDetailResponse(data=doc)

        assert resp.data is doc
        assert resp.error is None

    def test_error_envelope(self):
        """Test error response contains error and null data."""
        error = ErrorDetail(message="Not found", code="NOT_FOUND")
        resp = DocumentDetailResponse(error=error)

        assert resp.data is None
        assert resp.error.message == "Not found"
        assert resp.error.code == "NOT_FOUND"

    def test_serialization_uses_camel_case(self):
        """Test that serialized output uses camelCase field aliases."""
        doc = _sample_document_response()
        resp = DocumentDetailResponse(data=doc)
        output = resp.model_dump(by_alias=True)

        assert "createdAt" in output["data"]
        assert "pageCount" in output["data"]


class TestGenerateDocumentRequest:
    """Tests for GenerateDocumentRequest schema."""

    def test_accepts_camel_case_alias(self):
        """Test that referenceIds alias populates reference_ids field."""
        req = GenerateDocumentRequest(
            referenceIds=["id1", "id2"],
            context="Some context",
        )

        assert req.reference_ids == ["id1", "id2"]
        assert req.context == "Some context"

    def test_accepts_snake_case_field_name(self):
        """Test that reference_ids can be set via populate_by_name."""
        req = GenerateDocumentRequest(
            reference_ids=["id1"],
            context="Context text",
        )

        assert req.reference_ids == ["id1"]

    def test_serialization_uses_camel_case(self):
        """Test that serialized output uses camelCase alias."""
        req = GenerateDocumentRequest(
            referenceIds=["id1"],
            context="Some context",
        )
        output = req.model_dump(by_alias=True)

        assert "referenceIds" in output
        assert output["referenceIds"] == ["id1"]


class TestUpdateDocumentStatusRequest:
    """Tests for UpdateDocumentStatusRequest schema."""

    def test_accepts_valid_status(self):
        """Test that a valid DocumentStatus is accepted."""
        req = UpdateDocumentStatusRequest(status=DocumentStatus.DONE)

        assert req.status == DocumentStatus.DONE

    def test_rejects_invalid_status(self):
        """Test that an invalid status value raises a validation error."""
        import pydantic

        with pytest.raises(pydantic.ValidationError):
            UpdateDocumentStatusRequest(status="InvalidStatus")
