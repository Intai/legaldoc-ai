"""Tests for assistant schema models."""

import pytest
from pydantic import ValidationError

from api.schemas.assistant import AssistantQueryRequest


class TestAssistantQueryRequest:
    """Tests for AssistantQueryRequest schema."""

    def test_stores_query_field(self):
        """Test that AssistantQueryRequest stores the provided query."""
        req = AssistantQueryRequest(query="What is a contract?")

        assert req.query == "What is a contract?"

    def test_rejects_missing_query(self):
        """Test that AssistantQueryRequest raises ValidationError
        when query is missing."""
        with pytest.raises(ValidationError):
            AssistantQueryRequest()
