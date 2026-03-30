"""Reference API endpoints."""

import io
from pathlib import Path

from fastapi import APIRouter, Query, UploadFile
from pypdf import PdfReader

from api.models.document import DocumentType
from api.models.reference import ReferenceModel
from api.schemas.common import ErrorDetail
from api.schemas.reference import (
    ReferenceCreateResponse,
    ReferenceListData,
    ReferenceListResponse,
    ReferenceResponse,
)

router = APIRouter(prefix="/references", tags=["references"])

SUPPORTED_EXTENSIONS = {".pdf", ".txt"}


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


@router.get("", response_model=ReferenceListResponse)
async def list_references(
    type: DocumentType | None = Query(None, description="Filter by document type"),
) -> ReferenceListResponse:
    """Return all references sorted by created_at descending.

    Supports optional filtering by document type.
    """
    try:
        query = {}

        if type is not None:
            query["type"] = type

        refs = await ReferenceModel.find(query).sort("-created_at").to_list()

        return ReferenceListResponse(
            data=ReferenceListData(
                references=[_serialize_reference(r) for r in refs],
            ),
        )

    except Exception as exc:
        return ReferenceListResponse(
            error=ErrorDetail(
                message=str(exc),
                code="INTERNAL_ERROR",
            ),
        )


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

    try:
        if ext == ".pdf":
            text = _extract_text_from_pdf(content)
        else:
            text = content.decode("utf-8")
    except Exception as exc:
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
