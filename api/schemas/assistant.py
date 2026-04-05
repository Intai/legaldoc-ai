"""Pydantic request schemas for assistant endpoints."""

from pydantic import BaseModel


class AssistantQueryRequest(BaseModel):
    """Request body for querying the assistant.

    Attributes:
        query: The user's query string.
    """

    query: str
