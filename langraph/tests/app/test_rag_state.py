import asyncio

from langraph.app.rag_state import RAGState


def test_create_state_with_required_fields_only():
    state: RAGState = {
        "query": "What is force majeure?",
    }
    assert state["query"] == "What is force majeure?"


def test_create_state_with_all_optional_fields():
    queue: asyncio.Queue = asyncio.Queue()
    state: RAGState = {
        "query": "Explain indemnity clauses",
        "vector_chunks": [{"text": "chunk1", "score": 0.9}],
        "sparql_chunks": [{"text": "clause1", "uri": "http://example.org/1"}],
        "reranked_chunks": [{"text": "chunk1", "score": 0.95}],
        "answer": "Indemnity clauses protect against losses...",
        "sources": [{"document": "contract.pdf", "page": 3}],
        "token_callback": queue,
    }
    assert state["vector_chunks"] == [{"text": "chunk1", "score": 0.9}]
    assert state["sparql_chunks"] == [{"text": "clause1", "uri": "http://example.org/1"}]
    assert state["reranked_chunks"] == [{"text": "chunk1", "score": 0.95}]
    assert state["answer"] == "Indemnity clauses protect against losses..."
    assert state["sources"] == [{"document": "contract.pdf", "page": 3}]
    assert state["token_callback"] is queue


def test_state_with_empty_query():
    state: RAGState = {
        "query": "",
    }
    assert state["query"] == ""


def test_state_with_multiple_vector_chunks():
    state: RAGState = {
        "query": "What are the termination conditions?",
        "vector_chunks": [
            {"text": "Section 5.1 Termination...", "score": 0.92},
            {"text": "Section 5.2 Early termination...", "score": 0.85},
            {"text": "Section 5.3 Mutual termination...", "score": 0.78},
        ],
    }
    assert len(state["vector_chunks"]) == 3
    assert state["vector_chunks"][0]["score"] == 0.92


def test_state_with_multiple_sparql_chunks():
    state: RAGState = {
        "query": "What are the obligations?",
        "sparql_chunks": [
            {"text": "Obligation 1", "uri": "http://example.org/1"},
            {"text": "Obligation 2", "uri": "http://example.org/2"},
        ],
    }
    assert len(state["sparql_chunks"]) == 2
    assert state["sparql_chunks"][0]["uri"] == "http://example.org/1"


def test_state_sources_contains_structured_dicts():
    state: RAGState = {
        "query": "List all obligations",
        "sources": [
            {"document": "lease.pdf", "page": 1},
            {"document": "addendum.pdf", "page": 4},
        ],
    }
    assert len(state["sources"]) == 2
    assert state["sources"][0]["document"] == "lease.pdf"
    assert state["sources"][1]["page"] == 4
