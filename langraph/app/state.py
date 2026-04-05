import asyncio
from typing import NotRequired, TypedDict


class GenerateDocumentState(TypedDict):
    references: list[bytes]
    context: str
    title: NotRequired[str]
    doc_type: NotRequired[str]
    analysis: NotRequired[str]
    outline: NotRequired[str]
    draft: NotRequired[str]
    sections: NotRequired[list[dict]]
    document_id: NotRequired[str]
    description: NotRequired[str]
    phase_callback: NotRequired[asyncio.Queue]
