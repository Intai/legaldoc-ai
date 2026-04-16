"""Document API endpoints."""

import asyncio
import base64
import io
import json
import logging
from datetime import datetime
from enum import StrEnum
from urllib.parse import quote

from beanie import PydanticObjectId
from bson import ObjectId
from fastapi import APIRouter, Query
from fastapi.responses import Response
from pymongo import ReturnDocument
from sse_starlette.sse import EventSourceResponse

from api.core.mcp import mcp
from api.models.document import DocumentModel, DocumentStatus, DocumentType
from api.models.reference import ReferenceModel
from api.schemas.document import (
    DocumentDetailResponse,
    DocumentListData,
    DocumentListResponse,
    DocumentResponse,
    ErrorDetail,
    GenerateDocumentRequest,
    UpdateDocumentStatusRequest,
)

logger = logging.getLogger(__name__)

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


def _serialize_document(doc: DocumentModel | dict) -> DocumentResponse:
    """Convert a Beanie DocumentModel or raw MongoDB dict to a response schema.

    Args:
        doc: A Beanie document model instance or a raw MongoDB dict.

    Returns:
        A DocumentResponse with camelCase field aliases.
    """
    if isinstance(doc, dict):
        return DocumentResponse(
            id=str(doc["_id"]),
            title=doc["title"],
            type=doc["type"],
            status=doc["status"],
            description=doc["description"],
            createdAt=doc["created_at"].isoformat(),
            pageCount=doc["page_count"],
        )
    return DocumentResponse(
        id=str(doc.id),
        title=doc.title,
        type=doc.type,
        status=doc.status,
        description=doc.description,
        createdAt=doc.created_at.isoformat(),
        pageCount=doc.page_count,
    )


def _serialize_document_dict(doc: DocumentModel | dict) -> dict:
    """Convert a Beanie DocumentModel or raw MongoDB dict to a plain dict.

    Includes a pdfUrl field derived from the document ID.

    Args:
        doc: A Beanie document model instance or a raw MongoDB dict.

    Returns:
        A dict with id, title, type, status, description, createdAt,
        pageCount, and pdfUrl fields.
    """
    if isinstance(doc, dict):
        doc_id = str(doc["_id"])
        return {
            "id": doc_id,
            "title": doc["title"],
            "type": doc["type"],
            "status": doc["status"],
            "description": doc["description"],
            "createdAt": doc["created_at"].isoformat(),
            "pageCount": doc["page_count"],
            "pdfUrl": f"/api/v1/documents/{doc_id}/pdf",
        }
    doc_id = str(doc.id)
    return {
        "id": doc_id,
        "title": doc.title,
        "type": doc.type,
        "status": doc.status,
        "description": doc.description,
        "createdAt": doc.created_at.isoformat(),
        "pageCount": doc.page_count,
        "pdfUrl": f"/api/v1/documents/{doc_id}/pdf",
    }


async def _query_documents(
    sort: "SortOption",
    type: DocumentType | None = None,
    cursor: str | None = None,
    limit: int = 6,
) -> tuple[list[DocumentModel], str | None]:
    """Query documents with cursor-based pagination.

    Args:
        sort: Sort order (recent or alpha).
        type: Optional document type filter.
        cursor: Optional pagination cursor.
        limit: Maximum number of documents to return.

    Returns:
        A tuple of (documents, next_cursor).

    Raises:
        ValueError: If the cursor is invalid.
    """
    query: dict = {}

    if type is not None:
        query["type"] = type

    if cursor is not None:
        try:
            cursor_data = _decode_cursor(cursor)
            cursor_id = PydanticObjectId(cursor_data["_id"])
        except Exception:
            raise ValueError("Invalid cursor value.")

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

    sort_field = "-created_at" if sort == SortOption.RECENT else "+title"

    docs = await DocumentModel.find(query).sort(sort_field).limit(limit + 1).to_list()

    has_next = len(docs) > limit
    if has_next:
        docs = docs[:limit]

    next_cursor = _encode_cursor(docs[-1], sort) if has_next and docs else None

    return docs, next_cursor


async def _find_and_update_status(
    document_id: str, status: str
) -> dict | None:
    """Find a document by ID and update its status.

    Args:
        document_id: The MongoDB ObjectId string.
        status: The new status value.

    Returns:
        The raw MongoDB document dict after update, or None if not found.

    Raises:
        ValueError: If the document_id is invalid.
    """
    try:
        doc_id = PydanticObjectId(document_id)
    except Exception:
        raise ValueError("Invalid document ID.")

    raw = await DocumentModel.get_motor_collection().find_one_and_update(
        {"_id": doc_id},
        {"$set": {"status": status}},
        return_document=ReturnDocument.AFTER,
    )
    return raw


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
        docs, next_cursor = await _query_documents(sort, type, cursor, limit)

        return DocumentListResponse(
            data=DocumentListData(
                documents=[_serialize_document(d) for d in docs],
                nextCursor=next_cursor,
            ),
        )

    except ValueError:
        logger.warning("Invalid cursor value received")
        return DocumentListResponse(
            error=ErrorDetail(
                message="Invalid cursor value.",
                code="INVALID_CURSOR",
            ),
        )

    except Exception as exc:
        logger.exception("Failed to list documents")
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
        logger.exception("Failed to fetch document")
        return DocumentDetailResponse(
            error=ErrorDetail(
                message=str(exc),
                code="INTERNAL_ERROR",
            ),
        )

    if doc is None:
        logger.warning("Document not found: %s", id)
        return DocumentDetailResponse(
            error=ErrorDetail(
                message="Document not found.",
                code="NOT_FOUND",
            ),
        )

    return DocumentDetailResponse(
        data=_serialize_document(doc),
    )


@router.put("/{id}/status", response_model=DocumentDetailResponse)
async def update_document_status(
    id: str, body: UpdateDocumentStatusRequest
) -> DocumentDetailResponse:
    """Update a document's status by its MongoDB ObjectId.

    Accepts a JSON body with a status field and persists the change.
    Returns the updated document in the standard envelope.
    """
    try:
        raw = await _find_and_update_status(id, body.status)
    except ValueError:
        return DocumentDetailResponse(
            error=ErrorDetail(
                message="Invalid document ID.",
                code="INVALID_ID",
            ),
        )
    except Exception as exc:
        logger.exception("Failed to update document status")
        return DocumentDetailResponse(
            error=ErrorDetail(
                message=str(exc),
                code="INTERNAL_ERROR",
            ),
        )

    if raw is None:
        logger.warning("Document not found: %s", id)
        return DocumentDetailResponse(
            error=ErrorDetail(
                message="Document not found.",
                code="NOT_FOUND",
            ),
        )

    return DocumentDetailResponse(
        data=_serialize_document(raw),
    )


@mcp.tool()
async def mcp_list_documents(
    type: str | None = None,
    sort: str = "recent",
    cursor: str | None = None,
    limit: int = 6,
) -> dict:
    """List legal documents with cursor-based pagination.

    Args:
        type: Optional document type to filter by
              (Contract, Policy, Employment, NDA).
        sort: Sort order: "recent" (newest first) or "alpha" (A-Z by title).
        cursor: Pagination cursor from a previous response's nextCursor.
        limit: Maximum number of documents to return (1-50).

    Returns:
        A dict with documents (list of document dicts each including a
        pdfUrl) and nextCursor for the next page.
    """
    doc_type = DocumentType(type) if type is not None else None
    sort_option = SortOption(sort)
    docs, next_cursor = await _query_documents(sort_option, doc_type, cursor, limit)
    return {
        "documents": [_serialize_document_dict(d) for d in docs],
        "nextCursor": next_cursor,
    }


@mcp.tool()
async def mcp_update_document_status(document_id: str, status: str) -> dict:
    """Update a legal document's status.

    Args:
        document_id: The MongoDB ObjectId of the document to update.
        status: The new status (Done, Draft, Generating).

    Returns:
        The updated document dict with id, title, type, status,
        description, createdAt, pageCount, and pdfUrl.
    """
    raw = await _find_and_update_status(document_id, DocumentStatus(status))
    if raw is None:
        return {"error": "Document not found."}
    return _serialize_document_dict(raw)


@mcp.tool()
async def mcp_generate_document(
    reference_ids: list[str], context: str
) -> dict:
    """Generate a new legal document from reference documents and user context.

    Runs the full generation workflow (analyze, structure, draft, finalize),
    builds the PDF, and persists the new document.

    Args:
        reference_ids: List of reference document MongoDB ObjectId strings.
        context: User-provided context or questions for document generation.

    Returns:
        A dict with the new documentId string.
    """
    request = GenerateDocumentRequest(
        referenceIds=reference_ids, context=context
    )
    async for event in _generate_events(request):
        event_type = event.get("event")
        if event_type == "error":
            data = json.loads(event["data"])
            raise RuntimeError(data["message"])
        if event_type == "complete":
            data = json.loads(event["data"])
            return {"documentId": data["documentId"]}
    raise RuntimeError("Generation ended without a complete event.")


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
        logger.warning("Document not found: %s", id)
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
            "Content-Disposition": (
                "attachment; "
                f'filename="{doc.title.encode("ascii", "ignore").decode()}.pdf"; '
                f"filename*=UTF-8''{quote(doc.title)}.pdf"
            ),
        },
    )


def build_pdf(title: str, sections: list[dict]) -> tuple[bytes, int]:
    """Generate a PDF from structured sections using reportlab.

    Each section has a ``heading`` string and a ``content`` list of blocks.
    Supported block types:

    - ``paragraph`` – plain body text
    - ``bold`` – bold body text
    - ``italic`` – italic body text
    - ``list`` – bullet-point list with an ``items`` list of strings

    Args:
        title: The document title displayed at the top of the PDF.
        sections: A list of dicts, each with ``heading`` (str) and
            ``content`` (list of block dicts).

    Returns:
        A tuple of (pdf_bytes, page_count).
    """
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        ListFlowable,
        ListItem,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        topMargin=1 * inch,
        bottomMargin=1 * inch,
        leftMargin=1 * inch,
        rightMargin=1 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Title"],
        fontSize=18,
        spaceAfter=20,
    )
    heading_style = ParagraphStyle(
        "DocHeading",
        parent=styles["Heading2"],
        fontSize=13,
        spaceAfter=8,
        spaceBefore=14,
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["BodyText"],
        fontSize=11,
        leading=15,
        spaceAfter=10,
    )
    bold_style = ParagraphStyle(
        "DocBold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )
    italic_style = ParagraphStyle(
        "DocItalic",
        parent=body_style,
        fontName="Helvetica-Oblique",
    )

    elements: list = []
    elements.append(Paragraph(title, title_style))
    elements.append(Spacer(1, 12))

    for section in sections:
        heading = section.get("heading", "")
        if heading:
            elements.append(Paragraph(heading, heading_style))

        for block in section.get("content", []):
            block_type = block.get("type", "")
            if block_type == "paragraph":
                elements.append(Paragraph(block.get("text", ""), body_style))
            elif block_type == "bold":
                elements.append(Paragraph(block.get("text", ""), bold_style))
            elif block_type == "italic":
                elements.append(Paragraph(block.get("text", ""), italic_style))

            items = block.get("items", [])
            if items:
                if block_type == "list":
                    elements.append(
                        ListFlowable(
                            [
                                ListItem(Paragraph(item, body_style))
                                for item in items
                            ],
                            bulletType="bullet",
                            start="bulletchar",
                        )
                    )
                else:
                    for item in items:
                        elements.append(Paragraph(item, body_style))

    page_counter: list[int] = [0]

    def _on_page(_canvas, _doc):
        page_counter[0] += 1

    doc.build(elements, onFirstPage=_on_page, onLaterPages=_on_page)
    return buf.getvalue(), page_counter[0]


async def _generate_events(request: GenerateDocumentRequest):
    """Yield SSE phase events from the LangGraph workflow, then a complete event.

    Looks up references, runs the compiled graph as a background task,
    streams progress phase events from an asyncio.Queue, builds the PDF
    when the finalize node signals "ready", creates a DocumentModel with
    a pre-generated ID, and yields the final complete event. The graph
    task continues independently so the ingest node can run in the
    background after the SSE connection closes.
    """
    from langraph.app.graph import build_graph

    try:
        # Look up references
        ref_ids = [PydanticObjectId(rid) for rid in request.reference_ids]
        references = []
        for rid in ref_ids:
            ref = await ReferenceModel.get(rid)
            if ref is not None:
                references.append(ref)

        if not references:
            logger.warning(
                "No valid references found for IDs: %s",
                request.reference_ids,
            )
            yield {
                "event": "error",
                "data": json.dumps({
                    "message": "No valid references found.",
                    "code": "NOT_FOUND",
                }),
            }
            return

        # Pre-generate document ID so it can be shared with the graph
        document_id = ObjectId()

        # Build initial state with phase callback queue
        queue: asyncio.Queue = asyncio.Queue()
        state = {
            "references": [
                ref.pdf_content for ref in references if ref.pdf_content
            ],
            "context": request.context,
            "document_id": str(document_id),
            "phase_callback": queue,
        }

        logger.info("Document generation started")

        # Compile and run graph in background
        graph = build_graph()

        async def run_graph():
            try:
                await graph.ainvoke(state)
            except Exception as exc:
                logger.exception("Graph execution failed")
                await queue.put(("error", exc))

        asyncio.create_task(run_graph())

        # Yield SSE events from queue
        while True:
            event = await queue.get()
            if isinstance(event, tuple) and event[0] == "ready":
                payload = event[1]
                # Build PDF from finalize node payload
                pdf_bytes, page_count = build_pdf(
                    payload["title"], payload["sections"]
                )
                # Create document with pre-generated ID
                doc = DocumentModel(
                    id=document_id,
                    title=payload["title"],
                    type=payload["doc_type"],
                    status=DocumentStatus.DRAFT,
                    description=payload.get(
                        "description", request.context[:200]
                    ),
                    page_count=page_count,
                    pdf_content=pdf_bytes,
                )
                await doc.insert()
                logger.info("Document created: %s", document_id)
                yield {
                    "event": "complete",
                    "data": json.dumps({"documentId": str(document_id)}),
                }
                return
            elif isinstance(event, tuple) and event[0] == "error":
                raise event[1]
            else:
                # Phase event from a node
                yield {"event": "phase", "data": json.dumps({"phase": event})}

    except Exception as exc:
        logger.exception("Document generation failed")
        yield {
            "event": "error",
            "data": json.dumps({
                "message": str(exc),
                "code": "INTERNAL_ERROR",
            }),
        }


@router.post("/generate", response_model=None)
async def generate_document(request: GenerateDocumentRequest):
    """Generate a new legal document from reference documents and user context.

    Accepts reference IDs and context, then streams SSE events to indicate
    progress through generation phases (analyzing, structuring, drafting,
    finalizing). The final event includes the new document ID.
    """
    return EventSourceResponse(_generate_events(request))
