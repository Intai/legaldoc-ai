import functools
import importlib
import sys
from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest


def _passthrough_traced_node(name):
    """A no-op traced_node decorator for testing."""

    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(state):
            return await fn(state)

        wrapper._traced_node_name = name
        return wrapper

    return decorator


def _make_search_results():
    """Create sample search results matching vector_store.search output."""
    return [
        {
            "content": "Termination clause text",
            "document_id": "doc_1",
            "title": "Service Agreement",
            "type": "Contract",
            "clause_type": "termination",
            "heading": "Section 8",
            "score": 0.95,
        },
        {
            "content": "Liability limitation text",
            "document_id": "doc_2",
            "title": "NDA Template",
            "type": "NDA",
            "clause_type": "liability",
            "heading": "Section 3",
            "score": 0.88,
        },
    ]


@pytest.fixture()
def mock_vector_store():
    return MagicMock()


@pytest.fixture()
def retrieve_module(mock_vector_store):
    """Import retrieve_vector_node with vector_store mocked."""
    fake_vs_mod = ModuleType("langraph.services.vector_store")
    fake_vs_mod.search = mock_vector_store.search

    fake_services = ModuleType("langraph.services")
    fake_services.vector_store = fake_vs_mod

    fake_tracing_mod = ModuleType("langraph.services.tracing")
    fake_tracing_mod.traced_node = _passthrough_traced_node

    sys.modules.pop("langraph.nodes.retrieve_vector_node", None)

    with patch.dict(
        sys.modules,
        {
            "langraph.services": fake_services,
            "langraph.services.vector_store": fake_vs_mod,
            "langraph.services.tracing": fake_tracing_mod,
        },
    ):
        mod = importlib.import_module("langraph.nodes.retrieve_vector_node")
        yield mod

    sys.modules.pop("langraph.nodes.retrieve_vector_node", None)


class TestRetrieveVectorNodeSearch:
    async def test_calls_search_with_query_and_top_k(
        self, retrieve_module, mock_vector_store
    ):
        mock_vector_store.search.return_value = []
        state = {"query": "termination clause"}
        await retrieve_module.retrieve_vector_node(state)

        mock_vector_store.search.assert_called_once_with(
            "termination clause", top_k=10
        )

    async def test_passes_different_query_to_search(
        self, retrieve_module, mock_vector_store
    ):
        mock_vector_store.search.return_value = []
        state = {"query": "liability limitation"}
        await retrieve_module.retrieve_vector_node(state)

        mock_vector_store.search.assert_called_once_with(
            "liability limitation", top_k=10
        )


class TestRetrieveVectorNodeReturnValue:
    async def test_returns_search_results_as_vector_chunks(
        self, retrieve_module, mock_vector_store
    ):
        results = _make_search_results()
        mock_vector_store.search.return_value = results
        state = {"query": "termination clause"}

        output = await retrieve_module.retrieve_vector_node(state)

        assert output == {"vector_chunks": results}

    async def test_returns_empty_list_when_no_results(
        self, retrieve_module, mock_vector_store
    ):
        mock_vector_store.search.return_value = []
        state = {"query": "obscure legal term"}

        output = await retrieve_module.retrieve_vector_node(state)

        assert output == {"vector_chunks": []}

    async def test_preserves_metadata_and_scores(
        self, retrieve_module, mock_vector_store
    ):
        results = _make_search_results()
        mock_vector_store.search.return_value = results
        state = {"query": "test"}

        output = await retrieve_module.retrieve_vector_node(state)

        first = output["vector_chunks"][0]
        assert first["content"] == "Termination clause text"
        assert first["document_id"] == "doc_1"
        assert first["title"] == "Service Agreement"
        assert first["type"] == "Contract"
        assert first["clause_type"] == "termination"
        assert first["heading"] == "Section 8"
        assert first["score"] == 0.95


class TestRetrieveVectorNodeTracing:
    def test_traced_node_decorator_applied_with_retrieve_vector_name(
        self, retrieve_module
    ):
        assert (
            retrieve_module.retrieve_vector_node._traced_node_name
            == "retrieve_vector"
        )

    async def test_node_returns_correct_result_through_decorator(
        self, retrieve_module, mock_vector_store
    ):
        mock_vector_store.search.return_value = [{"content": "test"}]
        state = {"query": "test"}
        result = await retrieve_module.retrieve_vector_node(state)
        assert result == {"vector_chunks": [{"content": "test"}]}
