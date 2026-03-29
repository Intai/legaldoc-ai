"""Tests for common schema models."""

from api.schemas.common import ErrorDetail


class TestErrorDetail:
    """Tests for ErrorDetail schema."""

    def test_stores_message_and_code(self):
        """Test that ErrorDetail stores message and code fields."""
        error = ErrorDetail(message="Something went wrong", code="INTERNAL_ERROR")

        assert error.message == "Something went wrong"
        assert error.code == "INTERNAL_ERROR"

    def test_serialization(self):
        """Test that ErrorDetail serializes to a dict with message and code."""
        error = ErrorDetail(message="Not found", code="NOT_FOUND")
        output = error.model_dump()

        assert output == {"message": "Not found", "code": "NOT_FOUND"}
