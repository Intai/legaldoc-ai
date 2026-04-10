import asyncio
import functools
import json
import sys
from types import ModuleType
from unittest.mock import AsyncMock, MagicMock, patch

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


def _make_clause(clause_type, heading, content):
    """Create a fake Clause-like object with attribute access."""
    clause = MagicMock()
    clause.clause_type = clause_type
    clause.heading = heading
    clause.content = content
    return clause


def _make_result(clauses):
    """Create a fake ParseClausesResult-like object."""
    result = MagicMock()
    result.clauses = clauses
    return result


@pytest.fixture()
def llm_result():
    """Build a fake structured result with clause objects."""
    clauses = [
        _make_clause(
            "Termination",
            "Section 8. Termination",
            "Either party may terminate...",
        ),
        _make_clause(
            "Confidentiality",
            "Section 3. Confidentiality",
            "All information shall remain confidential...",
        ),
    ]
    return _make_result(clauses)


@pytest.fixture()
def mock_structured_llm(llm_result):
    structured = AsyncMock()
    structured.ainvoke.return_value = llm_result
    return structured


@pytest.fixture()
def mock_llm(mock_structured_llm):
    llm = MagicMock()
    llm.with_structured_output.return_value = mock_structured_llm
    return llm


@pytest.fixture()
def mock_upsert():
    return MagicMock()


@pytest.fixture()
def ingest_module(mock_llm, mock_upsert):
    """Import nodes.ingest_node with all external deps mocked."""
    fake_lc_core = ModuleType("langchain_core")
    fake_lc_messages = ModuleType("langchain_core.messages")

    class FakeHumanMessage:
        def __init__(self, content):
            self.content = content

    fake_lc_messages.HumanMessage = FakeHumanMessage
    fake_lc_core.messages = fake_lc_messages

    fake_parse_llm_mod = ModuleType("langraph.models.parse_llm")
    fake_parse_llm_mod.parse_llm = mock_llm

    mock_load_prompt = MagicMock(return_value="Parse clauses prompt")
    fake_loader_mod = ModuleType("langraph.prompts.loader")
    fake_loader_mod.load_prompt = mock_load_prompt

    fake_vector_store_mod = ModuleType("langraph.services.vector_store")
    fake_vector_store_mod.upsert_chunks = mock_upsert

    # Also register the parent package so Python resolves langraph.services
    fake_services_pkg = ModuleType("langraph.services")
    fake_services_pkg.vector_store = fake_vector_store_mod

    fake_tracing_mod = ModuleType("langraph.services.tracing")
    fake_tracing_mod.traced_node = _passthrough_traced_node

    sys.modules.pop("langraph.nodes.ingest_node", None)

    with patch.dict(
        sys.modules,
        {
            "langchain_core": fake_lc_core,
            "langchain_core.messages": fake_lc_messages,
            "langraph.models.parse_llm": fake_parse_llm_mod,
            "langraph.prompts.loader": fake_loader_mod,
            "langraph.services": fake_services_pkg,
            "langraph.services.vector_store": fake_vector_store_mod,
            "langraph.services.tracing": fake_tracing_mod,
        },
    ):
        import importlib

        mod = importlib.import_module("langraph.nodes.ingest_node")
        mod._mock_load_prompt = mock_load_prompt
        mod._FakeHumanMessage = FakeHumanMessage
        yield mod

    sys.modules.pop("langraph.nodes.ingest_node", None)


@pytest.fixture()
def base_state():
    return {
        "sections": [
            {"heading": "Section 8", "content": "Termination clause text"},
            {"heading": "Section 3", "content": "Confidentiality clause text"},
        ],
        "document_id": "doc-123",
        "title": "Service Agreement",
        "doc_type": "Contract",
    }


class TestIngestNodePhaseCallback:
    async def test_emits_ingesting_phase(self, ingest_module, base_state):
        queue = asyncio.Queue()
        base_state["phase_callback"] = queue
        await ingest_module.ingest_node(base_state)
        assert queue.get_nowait() == "ingesting"

    async def test_no_error_without_phase_callback(self, ingest_module, base_state):
        result = await ingest_module.ingest_node(base_state)
        assert result is not None


class TestIngestNodePromptConstruction:
    async def test_prompt_loaded_with_parse_clauses_name(
        self, ingest_module, base_state
    ):
        await ingest_module.ingest_node(base_state)
        ingest_module._mock_load_prompt.assert_called_once_with("parse_clauses")

    async def test_message_contains_prompt_and_sections(
        self, ingest_module, base_state, mock_structured_llm
    ):
        await ingest_module.ingest_node(base_state)
        message = mock_structured_llm.ainvoke.call_args[0][0][0]
        assert message.content[0]["type"] == "text"
        assert message.content[0]["text"] == "Parse clauses prompt"
        assert message.content[1]["type"] == "text"
        sections_text = message.content[1]["text"]
        parsed = json.loads(sections_text)
        assert parsed == base_state["sections"]


class TestIngestNodeLlmInvocation:
    async def test_with_structured_output_called_with_schema(
        self, ingest_module, base_state, mock_llm
    ):
        await ingest_module.ingest_node(base_state)
        mock_llm.with_structured_output.assert_called_once_with(
            ingest_module.ParseClausesResult
        )

    async def test_ainvoke_called_with_single_message_list(
        self, ingest_module, base_state, mock_structured_llm
    ):
        await ingest_module.ingest_node(base_state)
        args = mock_structured_llm.ainvoke.call_args[0][0]
        assert len(args) == 1
        assert isinstance(args[0], ingest_module._FakeHumanMessage)


class TestIngestNodeChunkBuilding:
    async def test_upsert_called_with_correct_chunks(
        self, ingest_module, base_state, mock_upsert
    ):
        await ingest_module.ingest_node(base_state)
        mock_upsert.assert_called_once()
        chunks = mock_upsert.call_args[0][0]
        assert len(chunks) == 2

        assert chunks[0] == {
            "content": "Either party may terminate...",
            "document_id": "doc-123",
            "title": "Service Agreement",
            "type": "Contract",
            "clause_type": "Termination",
            "heading": "Section 8. Termination",
        }
        assert chunks[1] == {
            "content": "All information shall remain confidential...",
            "document_id": "doc-123",
            "title": "Service Agreement",
            "type": "Contract",
            "clause_type": "Confidentiality",
            "heading": "Section 3. Confidentiality",
        }

    async def test_chunks_use_state_metadata(
        self, ingest_module, mock_llm, mock_upsert
    ):
        state = {
            "sections": [{"heading": "S1", "content": "text"}],
            "document_id": "other-doc",
            "title": "NDA Agreement",
            "doc_type": "NDA",
        }
        # Override structured LLM response for single clause
        single_result = _make_result(
            [_make_clause("Non-Compete", "S1", "text")]
        )
        mock_structured = AsyncMock()
        mock_structured.ainvoke.return_value = single_result
        with patch.object(
            ingest_module.parse_llm,
            "with_structured_output",
            return_value=mock_structured,
        ):
            await ingest_module.ingest_node(state)

        chunks = mock_upsert.call_args[0][0]
        assert chunks[0]["document_id"] == "other-doc"
        assert chunks[0]["title"] == "NDA Agreement"
        assert chunks[0]["type"] == "NDA"


class TestIngestNodeReturnValue:
    async def test_returns_empty_dict(self, ingest_module, base_state):
        result = await ingest_module.ingest_node(base_state)
        assert result == {}


class TestIngestNodeTracing:
    def test_traced_node_decorator_applied_with_ingest_name(self, ingest_module):
        assert ingest_module.ingest_node._traced_node_name == "ingest"

    async def test_node_returns_correct_result_through_decorator(
        self, ingest_module, base_state
    ):
        result = await ingest_module.ingest_node(base_state)
        assert result == {}
