"""Tests for document schema models."""

from api.schemas.document import (
    DocumentDetailResponse,
    DocumentResponse,
    ErrorDetail,
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
