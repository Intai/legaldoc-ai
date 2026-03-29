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


def _build_nda_pdf(title: str) -> tuple[bytes, int]:
    """Generate a hardcoded NDA PDF document using reportlab.

    Args:
        title: The document title to display in the PDF header.

    Returns:
        A tuple of (pdf_bytes, page_count).
    """
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

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
        "NDATitle",
        parent=styles["Title"],
        fontSize=18,
        spaceAfter=20,
    )
    heading_style = ParagraphStyle(
        "NDAHeading",
        parent=styles["Heading2"],
        fontSize=13,
        spaceAfter=8,
        spaceBefore=14,
    )
    body_style = ParagraphStyle(
        "NDABody",
        parent=styles["BodyText"],
        fontSize=11,
        leading=15,
        spaceAfter=6,
    )

    elements: list = []
    elements.append(Paragraph(title, title_style))
    elements.append(Spacer(1, 12))

    sections = [
        (
            "1. Definition of Confidential Information",
            (
                '"Confidential Information" means any non-public information '
                "disclosed by either party to the other, whether orally, in "
                "writing, or by inspection of tangible objects, that is "
                "designated as confidential or that reasonably should be "
                "understood to be confidential."
            ),
        ),
        (
            "2. Obligations of Receiving Party",
            (
                "The Receiving Party shall hold and maintain the Confidential "
                "Information in strict confidence, using the same degree of "
                "care that it uses to protect its own confidential information, "
                "but in no event less than reasonable care."
            ),
        ),
        (
            "3. Exclusions from Confidential Information",
            (
                "Confidential Information does not include information that: "
                "(a) is or becomes publicly available through no fault of the "
                "Receiving Party; (b) was known to the Receiving Party prior to "
                "disclosure; (c) is independently developed without use of "
                "Confidential Information; or (d) is rightfully obtained from "
                "a third party without restriction."
            ),
        ),
        (
            "4. Term and Termination",
            (
                "This Agreement shall remain in effect for a period of two (2) "
                "years from the date of execution. Either party may terminate "
                "this Agreement with thirty (30) days written notice."
            ),
        ),
        (
            "5. Return of Materials",
            (
                "Upon termination or request, the Receiving Party shall "
                "promptly return or destroy all materials containing "
                "Confidential Information and certify in writing that it has "
                "done so."
            ),
        ),
        (
            "6. Governing Law",
            (
                "This Agreement shall be governed by and construed in "
                "accordance with the laws of the State of Delaware, without "
                "regard to its conflict of laws principles."
            ),
        ),
    ]

    for heading, body in sections:
        elements.append(Paragraph(heading, heading_style))
        elements.append(Paragraph(body, body_style))

    page_counter: list[int] = [0]

    def _on_page(_canvas, _doc):
        page_counter[0] += 1

    doc.build(elements, onFirstPage=_on_page, onLaterPages=_on_page)
    return buf.getvalue(), page_counter[0]


async def _generate_events(request: GenerateDocumentRequest):
    """Yield SSE phase events with simulated delays, then a complete event.

    Looks up references, creates a DocumentModel, generates a PDF, and
    streams progress events to the client.
    """
    phases = ["analyzing", "structuring", "drafting", "finalizing"]

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

        title = ", ".join(ref.title for ref in references)
        doc_type = references[0].type
        description = request.context[:200]

        # Emit phase events with simulated delays
        for phase in phases[:-1]:
            yield {"event": "phase", "data": json.dumps({"phase": phase})}
            await asyncio.sleep(1.5)

        # Generate PDF
        pdf_bytes, page_count = _build_nda_pdf(title)

        # Create document
        doc = DocumentModel(
            title=title,
            type=doc_type,
            status=DocumentStatus.DRAFT,
            description=description,
            page_count=page_count,
            pdf_content=pdf_bytes,
        )
        await doc.insert()

        # Final phase
        yield {"event": "phase", "data": json.dumps({"phase": phases[-1]})}
        await asyncio.sleep(1.0)

        yield {
            "event": "complete",
            "data": json.dumps({"documentId": str(doc.id)}),
        }

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
