"""Document list API endpoint."""

from enum import StrEnum

from beanie import PydanticObjectId
from fastapi import APIRouter, Query

from api.models.document import DocumentModel, DocumentType
from api.schemas.document import (
    DocumentListData,
    DocumentListResponse,
    DocumentResponse,
    ErrorDetail,
)

router = APIRouter(prefix="/documents", tags=["documents"])


class SortOption(StrEnum):
    """Allowed sort options for the document list."""

    RECENT = "recent"
    ALPHA = "alpha"


def _serialize_document(doc: DocumentModel) -> DocumentResponse:
    """Convert a Beanie DocumentModel to a camelCase response schema.

    Args:
        doc: The Beanie document model instance.

    Returns:
        A DocumentResponse with camelCase field aliases.
    """
    return DocumentResponse(
        id=str(doc.id),
        title=doc.title,
        type=doc.type,
        status=doc.status,
        description=doc.description,
        createdAt=doc.created_at.isoformat(),
        pageCount=doc.page_count,
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    sort: SortOption = Query(SortOption.RECENT, description="Sort order"),
    type: DocumentType | None = Query(None, description="Filter by document type"),
    cursor: str | None = Query(None, description="Cursor for pagination"),
    limit: int = Query(6, ge=1, le=50, description="Page size"),
) -> DocumentListResponse:
    """Return a paginated list of documents.

    Supports sorting by recent (created_at desc) or alphabetical (title asc),
    optional filtering by document type, and cursor-based pagination using
    document IDs.
    """
    try:
        query = {}

        if type is not None:
            query["type"] = type

        if cursor is not None:
            try:
                cursor_id = PydanticObjectId(cursor)
            except Exception:
                return DocumentListResponse(
                    error=ErrorDetail(
                        message="Invalid cursor value.",
                        code="INVALID_CURSOR",
                    ),
                )
            query["_id"] = {"$gt": cursor_id}

        if sort == SortOption.RECENT:
            sort_field = "-created_at"
        else:
            sort_field = "+title"

        docs = (
            await DocumentModel.find(query)
            .sort(sort_field)
            .limit(limit + 1)
            .to_list()
        )

        has_next = len(docs) > limit
        if has_next:
            docs = docs[:limit]

        next_cursor = str(docs[-1].id) if has_next and docs else None

        return DocumentListResponse(
            data=DocumentListData(
                documents=[_serialize_document(d) for d in docs],
                nextCursor=next_cursor,
            ),
        )

    except Exception as exc:
        return DocumentListResponse(
            error=ErrorDetail(
                message=str(exc),
                code="INTERNAL_ERROR",
            ),
        )
