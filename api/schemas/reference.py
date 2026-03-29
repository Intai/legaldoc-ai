"""Pydantic response schemas for reference endpoints."""

from pydantic import BaseModel, Field

from api.schemas.common import ErrorDetail


class ReferenceResponse(BaseModel):
    """A single reference in API responses with camelCase field names.

    Attributes:
        id: The reference ID.
        title: The reference title.
        type: The category of legal document.
        description: A brief summary of the reference.
        created_at: Timestamp when the reference was created.
    """

    id: str
    title: str
    type: str
    description: str
    created_at: str = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class ReferenceListData(BaseModel):
    """Wrapper for reference list data.

    Attributes:
        references: List of references.
    """

    references: list[ReferenceResponse]


class ReferenceListResponse(BaseModel):
    """Top-level response for the reference list endpoint.

    Attributes:
        data: The reference list data, or None on error.
        error: The error detail, or None on success.
    """

    data: ReferenceListData | None = None
    error: ErrorDetail | None = None


class ReferenceCreateResponse(BaseModel):
    """Top-level response for the reference create endpoint.

    Attributes:
        data: The created reference, or None on error.
        error: The error detail, or None on success.
    """

    data: ReferenceResponse | None = None
    error: ErrorDetail | None = None
