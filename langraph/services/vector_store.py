"""Vector store service using Google Generative AI embeddings and Qdrant."""

import os
import uuid

from google import genai
from google.genai import types
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

COLLECTION_NAME = "legal_documents"
EMBEDDING_MODEL = "gemini-embedding-2-preview"
VECTOR_SIZE = 3072


def _get_qdrant_client() -> QdrantClient:
    """Create a Qdrant client from environment variables."""
    host = os.environ.get("QDRANT_HOST", "qdrant")
    port = int(os.environ.get("QDRANT_PORT", "6333"))
    return QdrantClient(host=host, port=port)


def _get_genai_client() -> genai.Client:
    """Create a Google Generative AI client from environment variables."""
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    return genai.Client(api_key=api_key)


def init_collection() -> None:
    """Create the legal_documents collection if it does not exist."""
    client = _get_qdrant_client()
    if not client.collection_exists(COLLECTION_NAME):
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )


def clear_collection() -> None:
    """Delete and recreate the legal_documents collection."""
    client = _get_qdrant_client()
    if client.collection_exists(COLLECTION_NAME):
        client.delete_collection(COLLECTION_NAME)
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=VECTOR_SIZE,
            distance=Distance.COSINE,
        ),
    )


def upsert_chunks(chunks: list[dict]) -> None:
    """Embed and upsert document chunks into the vector store.

    Each chunk dict must contain:
        - content: str
        - document_id: str
        - title: str
        - type: str
        - clause_type: str
        - heading: str
    """
    if not chunks:
        return

    qdrant = _get_qdrant_client()
    genai_client = _get_genai_client()

    texts = [chunk["content"] for chunk in chunks]

    response = genai_client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
    )

    points = []
    for chunk, embedding in zip(chunks, response.embeddings):
        point_id = str(uuid.uuid4())
        payload = {
            "content": chunk["content"],
            "document_id": chunk["document_id"],
            "title": chunk["title"],
            "type": chunk["type"],
            "clause_type": chunk["clause_type"],
            "heading": chunk["heading"],
        }
        points.append(
            PointStruct(
                id=point_id,
                vector=embedding.values,
                payload=payload,
            )
        )

    qdrant.upsert(collection_name=COLLECTION_NAME, points=points)


def search(query: str, top_k: int = 10) -> list[dict]:
    """Search for similar chunks by query text.

    Returns a list of dicts with chunk metadata and similarity score.
    """
    genai_client = _get_genai_client()

    response = genai_client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=[query],
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
    )

    query_vector = response.embeddings[0].values

    qdrant = _get_qdrant_client()
    results = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=top_k,
        with_payload=True,
    )

    return [
        {
            "content": point.payload.get("content", ""),
            "document_id": point.payload.get("document_id", ""),
            "title": point.payload.get("title", ""),
            "type": point.payload.get("type", ""),
            "clause_type": point.payload.get("clause_type", ""),
            "heading": point.payload.get("heading", ""),
            "score": point.score,
        }
        for point in results.points
    ]


def delete_by_document(doc_id: str) -> None:
    """Remove all chunks belonging to a specific document."""
    qdrant = _get_qdrant_client()
    qdrant.delete(
        collection_name=COLLECTION_NAME,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=doc_id),
                )
            ]
        ),
    )
