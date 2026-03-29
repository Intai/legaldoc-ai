"""Beanie document model for legal documents."""

from datetime import datetime, timezone
from enum import StrEnum
from typing import Optional

import pymongo
from beanie import Document as BeanieDocument
from pydantic import Field


class DocumentType(StrEnum):
    """Allowed legal document types."""

    CONTRACT = "Contract"
    POLICY = "Policy"
    EMPLOYMENT = "Employment"
    NDA = "NDA"


class DocumentStatus(StrEnum):
    """Allowed document statuses."""

    DONE = "Done"
    DRAFT = "Draft"
    GENERATING = "Generating"


class DocumentModel(BeanieDocument):
    """A legal document stored in MongoDB.

    Attributes:
        title: The document title.
        type: The category of legal document.
        status: The current processing status.
        description: A brief summary of the document.
        created_at: Timestamp when the document was created (UTC).
        page_count: Number of pages in the document.
        pdf_content: Raw PDF bytes for the document.
    """

    title: str
    type: DocumentType
    status: DocumentStatus
    description: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    page_count: int
    pdf_content: Optional[bytes] = None

    class Settings:
        """Beanie collection configuration."""

        name = "documents"
        indexes = [
            [("created_at", pymongo.DESCENDING)],
        ]
