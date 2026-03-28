"""Seed the MongoDB database with sample legal documents.

Drops existing documents and inserts a clean set of sample records
covering all document types and statuses. Designed to be run via
``python -m api.db.seed`` for local development.
"""

import asyncio
from datetime import datetime, timezone

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from api.core.config import get_settings
from api.models.document import DocumentModel, DocumentStatus, DocumentType

SAMPLE_DOCUMENTS = [
    # --- Contract ---
    {
        "title": "SaaS Subscription Agreement",
        "type": DocumentType.CONTRACT,
        "status": DocumentStatus.DONE,
        "description": (
            "Standard SaaS subscription terms between provider"
            " and enterprise client."
        ),
        "created_at": datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc),
        "page_count": 12,
    },
    {
        "title": "Freelance Services Contract",
        "type": DocumentType.CONTRACT,
        "status": DocumentStatus.DRAFT,
        "description": (
            "Independent contractor agreement for software"
            " development services."
        ),
        "created_at": datetime(2026, 1, 12, 14, 30, tzinfo=timezone.utc),
        "page_count": 8,
    },
    {
        "title": "Vendor Supply Agreement",
        "type": DocumentType.CONTRACT,
        "status": DocumentStatus.GENERATING,
        "description": "Supply chain agreement with raw material vendor.",
        "created_at": datetime(2026, 2, 3, 11, 0, tzinfo=timezone.utc),
        "page_count": 15,
    },
    # --- Policy ---
    {
        "title": "Privacy Policy",
        "type": DocumentType.POLICY,
        "status": DocumentStatus.DONE,
        "description": "Company-wide privacy policy compliant with GDPR and CCPA.",
        "created_at": datetime(2026, 1, 20, 8, 0, tzinfo=timezone.utc),
        "page_count": 10,
    },
    {
        "title": "Acceptable Use Policy",
        "type": DocumentType.POLICY,
        "status": DocumentStatus.DRAFT,
        "description": "Guidelines for acceptable use of company IT resources.",
        "created_at": datetime(2026, 2, 1, 10, 15, tzinfo=timezone.utc),
        "page_count": 6,
    },
    {
        "title": "Data Retention Policy",
        "type": DocumentType.POLICY,
        "status": DocumentStatus.GENERATING,
        "description": (
            "Rules governing how long different categories"
            " of data are retained."
        ),
        "created_at": datetime(2026, 2, 18, 16, 45, tzinfo=timezone.utc),
        "page_count": 5,
    },
    # --- Employment ---
    {
        "title": "Senior Engineer Offer Letter",
        "type": DocumentType.EMPLOYMENT,
        "status": DocumentStatus.DONE,
        "description": "Employment offer for a senior software engineering position.",
        "created_at": datetime(2026, 1, 8, 9, 30, tzinfo=timezone.utc),
        "page_count": 4,
    },
    {
        "title": "Employee Handbook",
        "type": DocumentType.EMPLOYMENT,
        "status": DocumentStatus.DRAFT,
        "description": "Comprehensive handbook covering company policies and benefits.",
        "created_at": datetime(2026, 2, 10, 13, 0, tzinfo=timezone.utc),
        "page_count": 42,
    },
    {
        "title": "Severance Agreement",
        "type": DocumentType.EMPLOYMENT,
        "status": DocumentStatus.GENERATING,
        "description": (
            "Standard severance terms including non-compete"
            " and release clauses."
        ),
        "created_at": datetime(2026, 3, 1, 11, 0, tzinfo=timezone.utc),
        "page_count": 7,
    },
    # --- NDA ---
    {
        "title": "Mutual NDA — Acme Corp",
        "type": DocumentType.NDA,
        "status": DocumentStatus.DONE,
        "description": "Mutual non-disclosure agreement for partnership discussions.",
        "created_at": datetime(2026, 1, 15, 10, 0, tzinfo=timezone.utc),
        "page_count": 3,
    },
    {
        "title": "One-Way NDA — Investor Review",
        "type": DocumentType.NDA,
        "status": DocumentStatus.DRAFT,
        "description": (
            "Unilateral NDA protecting company IP during"
            " investor due diligence."
        ),
        "created_at": datetime(2026, 2, 22, 15, 0, tzinfo=timezone.utc),
        "page_count": 4,
    },
    {
        "title": "NDA — Board Advisory",
        "type": DocumentType.NDA,
        "status": DocumentStatus.GENERATING,
        "description": "Non-disclosure agreement for incoming board advisory members.",
        "created_at": datetime(2026, 3, 5, 9, 45, tzinfo=timezone.utc),
        "page_count": 3,
    },
    # --- Extra records for pagination ---
    {
        "title": "Office Lease Agreement",
        "type": DocumentType.CONTRACT,
        "status": DocumentStatus.DONE,
        "description": "Commercial lease for the downtown headquarters office space.",
        "created_at": datetime(2026, 3, 10, 8, 0, tzinfo=timezone.utc),
        "page_count": 20,
    },
    {
        "title": "Cookie Policy",
        "type": DocumentType.POLICY,
        "status": DocumentStatus.DONE,
        "description": "Website cookie consent and tracking disclosure policy.",
        "created_at": datetime(2026, 3, 15, 12, 0, tzinfo=timezone.utc),
        "page_count": 3,
    },
]


async def seed():
    """Drop existing documents and insert sample records.

    Connects to MongoDB, initialises Beanie, then replaces
    the ``documents`` collection contents with ``SAMPLE_DOCUMENTS``.
    """
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client[settings.mongodb_db_name],
        document_models=[DocumentModel],
    )

    await DocumentModel.find_all().delete()

    documents = [DocumentModel(**data) for data in SAMPLE_DOCUMENTS]
    await DocumentModel.insert_many(documents)

    print(f"Seeded {len(documents)} documents.")


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(seed())
