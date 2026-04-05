"""Retrieve relevant document chunks from the vector store."""

from langraph.services import vector_store


async def retrieve_node(state: dict) -> dict:
    """Embed the query and search Qdrant for the top-10 matching chunks."""
    results = vector_store.search(state["query"], top_k=10)

    return {
        "retrieved_chunks": results,
    }
