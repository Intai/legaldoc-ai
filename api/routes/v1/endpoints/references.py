"""Reference API endpoints."""

import io
import logging
from pathlib import Path

from fastapi import APIRouter, Query, UploadFile
from pypdf import PdfReader

from api.core.mcp import mcp
from api.models.document import DocumentType
from api.models.reference import ReferenceModel
from api.schemas.common import ErrorDetail
from api.schemas.reference import (
    ReferenceCreateResponse,
    ReferenceListData,
    ReferenceListResponse,
    ReferenceResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/references", tags=["references"])

SUPPORTED_EXTENSIONS = {".pdf", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _serialize_reference(ref: ReferenceModel) -> ReferenceResponse:
    """Convert a Beanie ReferenceModel to a camelCase response schema.

    Args:
        ref: The Beanie reference model instance.

    Returns:
        A ReferenceResponse with camelCase field aliases.
    """
    return ReferenceResponse(
        id=str(ref.id),
        title=ref.title,
        type=ref.type,
        description=ref.description,
        createdAt=ref.created_at.isoformat(),
    )


def _serialize_reference_dict(ref: ReferenceModel) -> dict:
    """Convert a Beanie ReferenceModel to a plain dict for MCP responses.

    Args:
        ref: The Beanie reference model instance.

    Returns:
        A dict with id, title, type, description, and createdAt fields.
    """
    return {
        "id": str(ref.id),
        "title": ref.title,
        "type": ref.type,
        "description": ref.description,
        "createdAt": ref.created_at.isoformat(),
    }


async def _query_references(
    type: DocumentType | None = None,
) -> list[ReferenceModel]:
    """Query references from the database with optional type filtering.

    Args:
        type: Optional document type to filter by.

    Returns:
        A list of ReferenceModel instances sorted by created_at descending.
    """
    query = {}

    if type is not None:
        query["type"] = type

    return await ReferenceModel.find(query).sort("-created_at").to_list()


@router.get("", response_model=ReferenceListResponse)
async def list_references(
    type: DocumentType | None = Query(None, description="Filter by document type"),
) -> ReferenceListResponse:
    """Return all references sorted by created_at descending.

    Supports optional filtering by document type.
    """
    try:
        refs = await _query_references(type)

        return ReferenceListResponse(
            data=ReferenceListData(
                references=[_serialize_reference(r) for r in refs],
            ),
        )

    except Exception as exc:
        logger.exception("Failed to list references")
        return ReferenceListResponse(
            error=ErrorDetail(
                message=str(exc),
                code="INTERNAL_ERROR",
            ),
        )


@mcp.tool()
async def mcp_list_references(type: str | None = None) -> list[dict]:
    """List all reference documents, optionally filtered by type.

    Args:
        type: Optional document type to filter by
              (Contract, Policy, Employment, NDA).

    Returns:
        A list of dicts with id, title, type, description, and createdAt.
    """
    doc_type = DocumentType(type) if type is not None else None
    refs = await _query_references(doc_type)
    return [_serialize_reference_dict(r) for r in refs]


def _extract_text_from_pdf(content: bytes) -> str:
    """Extract text content from PDF bytes using pypdf.

    Args:
        content: Raw PDF file bytes.

    Returns:
        Concatenated text from all pages.
    """
    reader = PdfReader(io.BytesIO(content))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "".join(pages)


@router.post("", response_model=ReferenceCreateResponse, status_code=201)
async def create_reference(file: UploadFile) -> ReferenceCreateResponse:
    """Upload a PDF or TXT file to create a new reference document.

    Extracts the filename (without extension) as the title, reads the text
    content, and uses the first 200 characters as the description.
    Returns 422 if the file type is not supported.
    """
    filename = file.filename or "untitled"
    ext = Path(filename).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        logger.warning("Unsupported file type: %s", ext)
        return ReferenceCreateResponse(
            error=ErrorDetail(
                message=(
                    f"Unsupported file type '{ext}'."
                    " Only PDF and TXT files are accepted."
                ),
                code="UNSUPPORTED_FILE_TYPE",
            ),
        )

    title = Path(filename).stem
    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        logger.warning("File size exceeds limit: %d bytes", len(content))
        return ReferenceCreateResponse(
            error=ErrorDetail(
                message="File size exceeds the 10 MB limit.",
                code="FILE_TOO_LARGE",
            ),
        )

    if ext == ".pdf" and content[:4] != b"%PDF":
        logger.warning("Invalid PDF content for file: %s", filename)
        return ReferenceCreateResponse(
            error=ErrorDetail(
                message="File does not appear to be a valid PDF.",
                code="INVALID_FILE_CONTENT",
            ),
        )

    try:
        if ext == ".pdf":
            text = _extract_text_from_pdf(content)
        else:
            text = content.decode("utf-8")
    except Exception as exc:
        logger.exception("Failed to extract text from file")
        return ReferenceCreateResponse(
            error=ErrorDetail(
                message=f"Failed to extract text: {exc}",
                code="EXTRACTION_ERROR",
            ),
        )

    description = text[:200]

    ref = ReferenceModel(
        title=title,
        type=DocumentType.CONTRACT,
        description=description,
        pdf_content=content,
    )
    await ref.insert()

    return ReferenceCreateResponse(data=_serialize_reference(ref))
