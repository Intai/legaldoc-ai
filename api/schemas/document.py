"""Pydantic request and response schemas for document endpoints."""

from pydantic import BaseModel, Field

from api.models.document import DocumentStatus
from api.schemas.common import ErrorDetail


class GenerateDocumentRequest(BaseModel):
    """Request body for the document generation endpoint.

    Attributes:
        reference_ids: List of reference document IDs to base generation on.
        context: User-provided context or questions for generation.
    """

    reference_ids: list[str] = Field(alias="referenceIds")
    context: str

    model_config = {"populate_by_name": True}


class DocumentResponse(BaseModel):
    """A single document in API responses with camelCase field names.

    Attributes:
        id: The document ID.
        title: The document title.
        type: The category of legal document.
        status: The current processing status.
        description: A brief summary of the document.
        created_at: Timestamp when the document was created.
        page_count: Number of pages in the document.
    """

    id: str
    title: str
    type: str
    status: str
    description: str
    created_at: str = Field(alias="createdAt")
    page_count: int = Field(alias="pageCount")

    model_config = {"populate_by_name": True}


class DocumentListData(BaseModel):
    """Wrapper for paginated document list data.

    Attributes:
        documents: List of documents for the current page.
        next_cursor: Cursor for the next page, or None if no more pages.
    """

    documents: list[DocumentResponse]
    next_cursor: str | None = Field(alias="nextCursor", default=None)

    model_config = {"populate_by_name": True}


class DocumentListResponse(BaseModel):
    """Top-level response for the document list endpoint.

    Attributes:
        data: The paginated document list data, or None on error.
        error: The error detail, or None on success.
    """

    data: DocumentListData | None = None
    error: ErrorDetail | None = None


class DocumentDetailResponse(BaseModel):
    """Top-level response for the document detail endpoint.

    Attributes:
        data: The document data, or None on error.
        error: The error detail, or None on success.
    """

    data: DocumentResponse | None = None
    error: ErrorDetail | None = None


class UpdateDocumentStatusRequest(BaseModel):
    """Request body for updating a document's status.

    Attributes:
        status: The new document status.
    """

    status: DocumentStatus
