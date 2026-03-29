"""Tests for reference schema models."""

from api.schemas.common import ErrorDetail
from api.schemas.reference import (
    ReferenceCreateResponse,
    ReferenceListData,
    ReferenceListResponse,
    ReferenceResponse,
)


def _sample_reference_response():
    """Create a sample ReferenceResponse for reuse in tests."""
    return ReferenceResponse(
        id="ref123",
        title="Test Reference",
        type="CONTRACT",
        description="A test reference.",
        createdAt="2025-01-15T10:00:00Z",
    )


class TestReferenceResponse:
    """Tests for ReferenceResponse schema."""

    def test_stores_all_fields(self):
        """Test that ReferenceResponse stores all provided fields."""
        ref = _sample_reference_response()

        assert ref.id == "ref123"
        assert ref.title == "Test Reference"
        assert ref.type == "CONTRACT"
        assert ref.description == "A test reference."
        assert ref.created_at == "2025-01-15T10:00:00Z"

    def test_serialization_uses_camel_case(self):
        """Test that serialized output uses camelCase field aliases."""
        ref = _sample_reference_response()
        output = ref.model_dump(by_alias=True)

        assert "createdAt" in output
        assert "created_at" not in output


class TestReferenceListData:
    """Tests for ReferenceListData schema."""

    def test_stores_references_list(self):
        """Test that ReferenceListData wraps a list of references."""
        ref = _sample_reference_response()
        data = ReferenceListData(references=[ref])

        assert len(data.references) == 1
        assert data.references[0].id == "ref123"

    def test_empty_references_list(self):
        """Test that ReferenceListData accepts an empty list."""
        data = ReferenceListData(references=[])

        assert data.references == []


class TestReferenceListResponse:
    """Tests for ReferenceListResponse schema."""

    def test_success_envelope(self):
        """Test success response contains data and null error."""
        ref = _sample_reference_response()
        data = ReferenceListData(references=[ref])
        resp = ReferenceListResponse(data=data)

        assert resp.data is data
        assert resp.error is None

    def test_error_envelope(self):
        """Test error response contains error and null data."""
        error = ErrorDetail(message="Server error", code="INTERNAL_ERROR")
        resp = ReferenceListResponse(error=error)

        assert resp.data is None
        assert resp.error.message == "Server error"
        assert resp.error.code == "INTERNAL_ERROR"

    def test_serialization(self):
        """Test that serialized output preserves nested camelCase aliases."""
        ref = _sample_reference_response()
        data = ReferenceListData(references=[ref])
        resp = ReferenceListResponse(data=data)
        output = resp.model_dump(by_alias=True)

        assert "createdAt" in output["data"]["references"][0]


class TestReferenceCreateResponse:
    """Tests for ReferenceCreateResponse schema."""

    def test_success_envelope(self):
        """Test success response contains data and null error."""
        ref = _sample_reference_response()
        resp = ReferenceCreateResponse(data=ref)

        assert resp.data is ref
        assert resp.error is None

    def test_error_envelope(self):
        """Test error response contains error and null data."""
        error = ErrorDetail(message="Bad file", code="UNSUPPORTED_FILE_TYPE")
        resp = ReferenceCreateResponse(error=error)

        assert resp.data is None
        assert resp.error.message == "Bad file"
        assert resp.error.code == "UNSUPPORTED_FILE_TYPE"
