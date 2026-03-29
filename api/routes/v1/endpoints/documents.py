"""Document API endpoints."""

import base64
import json
from datetime import datetime
from enum import StrEnum

from beanie import PydanticObjectId
from fastapi import APIRouter, Query
from fastapi.responses import Response

from api.models.document import DocumentModel, DocumentType
from api.schemas.document import (
    DocumentDetailResponse,
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


def _encode_cursor(doc: DocumentModel, sort: "SortOption") -> str:
    """Encode a pagination cursor from the last document and current sort."""
    if sort == SortOption.RECENT:
        payload = {"created_at": doc.created_at.isoformat(), "_id": str(doc.id)}
    else:
        payload = {"title": doc.title, "_id": str(doc.id)}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def _decode_cursor(cursor: str) -> dict:
    """Decode a pagination cursor string back to a dict."""
    return json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())


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
                cursor_data = _decode_cursor(cursor)
                cursor_id = PydanticObjectId(cursor_data["_id"])
            except Exception:
                return DocumentListResponse(
                    error=ErrorDetail(
                        message="Invalid cursor value.",
                        code="INVALID_CURSOR",
                    ),
                )

            if sort == SortOption.RECENT:
                cursor_date = datetime.fromisoformat(cursor_data["created_at"])
                query["$or"] = [
                    {"created_at": {"$lt": cursor_date}},
                    {"created_at": cursor_date, "_id": {"$lt": cursor_id}},
                ]
            else:
                cursor_title = cursor_data["title"]
                query["$or"] = [
                    {"title": {"$gt": cursor_title}},
                    {"title": cursor_title, "_id": {"$gt": cursor_id}},
                ]

        if sort == SortOption.RECENT:
            sort_field = "-created_at"
        else:
            sort_field = "+title"

        docs = (
            await DocumentModel.find(query).sort(sort_field).limit(limit + 1).to_list()
        )

        has_next = len(docs) > limit
        if has_next:
            docs = docs[:limit]

        next_cursor = _encode_cursor(docs[-1], sort) if has_next and docs else None

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


@router.get("/{id}", response_model=DocumentDetailResponse)
async def get_document(id: str) -> DocumentDetailResponse:
    """Return a single document by its MongoDB ObjectId.

    Fetches the document and returns its metadata (excluding pdf_content).
    Returns 404 if the document is not found.
    """
    try:
        doc_id = PydanticObjectId(id)
    except Exception:
        return DocumentDetailResponse(
            error=ErrorDetail(
                message="Invalid document ID.",
                code="INVALID_ID",
            ),
        )

    try:
        doc = await DocumentModel.get(doc_id)
    except Exception as exc:
        return DocumentDetailResponse(
            error=ErrorDetail(
                message=str(exc),
                code="INTERNAL_ERROR",
            ),
        )

    if doc is None:
        return DocumentDetailResponse(
            error=ErrorDetail(
                message="Document not found.",
                code="NOT_FOUND",
            ),
        )

    return DocumentDetailResponse(
        data=_serialize_document(doc),
    )


@router.get("/{id}/pdf", response_model=None)
async def get_document_pdf(id: str) -> Response | DocumentDetailResponse:
    """Return the stored PDF binary for a document.

    Fetches the document by its MongoDB ObjectId and returns the pdf_content
    bytes as an application/pdf response. Returns 404 if the document is not
    found or has no PDF content.
    """
    try:
        doc_id = PydanticObjectId(id)
    except Exception:
        return DocumentDetailResponse(
            error=ErrorDetail(
                message="Invalid document ID.",
                code="INVALID_ID",
            ),
        )

    doc = await DocumentModel.get(doc_id)

    if doc is None:
        return DocumentDetailResponse(
            error=ErrorDetail(
                message="Document not found.",
                code="NOT_FOUND",
            ),
        )

    if doc.pdf_content is None:
        return DocumentDetailResponse(
            error=ErrorDetail(
                message="Document has no PDF content.",
                code="NOT_FOUND",
            ),
        )

    return Response(
        content=doc.pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{doc.title}.pdf"',
        },
    )
