"""Beanie document model for reference documents."""

from datetime import datetime, timezone
from typing import Optional

import pymongo
from beanie import Document as BeanieDocument
from pydantic import Field

from api.models.document import DocumentType


class ReferenceModel(BeanieDocument):
    """A reference document stored in MongoDB.

    Attributes:
        title: The reference document title.
        type: The category of legal document.
        description: A brief summary of the reference.
        pdf_content: Raw uploaded file bytes, if available.
        created_at: Timestamp when the reference was created (UTC).
    """

    title: str
    type: DocumentType
    description: str
    pdf_content: Optional[bytes] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    class Settings:
        """Beanie collection configuration."""

        name = "references"
        indexes = [
            [("created_at", pymongo.DESCENDING)],
        ]
