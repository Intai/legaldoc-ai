import asyncio
from typing import NotRequired, TypedDict


class RAGState(TypedDict):
    query: str
    vector_chunks: NotRequired[list[dict]]
    sparql_chunks: NotRequired[list[dict]]
    reranked_chunks: NotRequired[list[dict]]
    answer: NotRequired[str]
    sources: NotRequired[list[dict]]
    token_callback: NotRequired[asyncio.Queue]
