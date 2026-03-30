"""Document API endpoints."""

import asyncio
import base64
import io
import json
from datetime import datetime
from enum import StrEnum

from beanie import PydanticObjectId
from fastapi import APIRouter, Query
from fastapi.responses import Response
from pymongo import ReturnDocument
from sse_starlette.sse import EventSourceResponse

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


@router.put("/{id}/status", response_model=DocumentDetailResponse)
async def update_document_status(
    id: str, body: UpdateDocumentStatusRequest
) -> DocumentDetailResponse:
    """Update a document's status by its MongoDB ObjectId.

    Accepts a JSON body with a status field and persists the change.
    Returns the updated document in the standard envelope.
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
        raw = await DocumentModel.get_motor_collection().find_one_and_update(
            {"_id": doc_id},
            {"$set": {"status": body.status}},
            return_document=ReturnDocument.AFTER,
        )
    except Exception as exc:
        return DocumentDetailResponse(
            error=ErrorDetail(
                message=str(exc),
                code="INTERNAL_ERROR",
            ),
        )

    if raw is None:
        return DocumentDetailResponse(
            error=ErrorDetail(
                message="Document not found.",
                code="NOT_FOUND",
            ),
        )

    return DocumentDetailResponse(
        data=_serialize_document(raw),
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
        spaceAfter=6,
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
            elif block_type == "list":
                items = block.get("items", [])
                if items:
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

    page_counter: list[int] = [0]

    def _on_page(_canvas, _doc):
        page_counter[0] += 1

    doc.build(elements, onFirstPage=_on_page, onLaterPages=_on_page)
    return buf.getvalue(), page_counter[0]


async def _generate_events(request: GenerateDocumentRequest):
    """Yield SSE phase events from the LangGraph workflow, then a complete event.

    Looks up references, runs the compiled graph as a background task,
    streams progress phase events from an asyncio.Queue, builds the PDF
    from the graph result, creates a DocumentModel, and yields the final
    complete event.
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
            yield {
                "event": "error",
                "data": json.dumps({
                    "message": "No valid references found.",
                    "code": "NOT_FOUND",
                }),
            }
            return

        # Build initial state with phase callback queue
        queue: asyncio.Queue = asyncio.Queue()
        state = {
            "references": [
                ref.pdf_content for ref in references if ref.pdf_content
            ],
            "context": request.context,
            "phase_callback": queue,
        }

        # Compile and run graph in background
        graph = build_graph()

        async def run_graph():
            try:
                result = await graph.ainvoke(state)
                await queue.put(("complete", result))
            except Exception as exc:
                await queue.put(("error", exc))

        task = asyncio.create_task(run_graph())

        # Yield SSE events from queue
        while True:
            event = await queue.get()
            if isinstance(event, tuple) and event[0] == "complete":
                result = event[1]
                # Build PDF from graph result
                pdf_bytes, page_count = build_pdf(
                    result["title"], result["sections"]
                )
                # Create document
                doc = DocumentModel(
                    title=result["title"],
                    type=result["doc_type"],
                    status=DocumentStatus.DRAFT,
                    description=result.get("description", request.context[:200]),
                    page_count=page_count,
                    pdf_content=pdf_bytes,
                )
                await doc.insert()
                yield {
                    "event": "complete",
                    "data": json.dumps({"documentId": str(doc.id)}),
                }
                break
            elif isinstance(event, tuple) and event[0] == "error":
                raise event[1]
            else:
                # Phase event from a node
                yield {"event": "phase", "data": json.dumps({"phase": event})}

        await task  # ensure no exceptions are lost

    except Exception as exc:
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
