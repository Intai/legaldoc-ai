import asyncio
import functools
import importlib
import json
import sys
from types import ModuleType
from unittest.mock import MagicMock, patch


def _make_stream_chunks(tokens):
    """Create a list of mock stream chunks from token strings."""
    chunks = []
    for token in tokens:
        chunk = MagicMock()
        chunk.content = token
        chunks.append(chunk)
    return chunks


async def _async_iter(items):
    """Helper to create an async iterator from a list."""
    for item in items:
        yield item


def _passthrough_traced_node(name):
    """A no-op traced_node decorator for testing."""

    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(state):
            return await fn(state)

        wrapper._traced_node_name = name
        return wrapper

    return decorator


def _import_answer_node(mock_llm, mock_loader):
    """Import answer_node with mocked dependencies."""
    sys.modules.pop("langraph.nodes.answer_node", None)
    sys.modules.pop("nodes.answer_node", None)

    mock_messages = MagicMock()
    mock_langchain_core = MagicMock()
    mock_langchain_core.messages = mock_messages

    fake_tracing_mod = ModuleType("langraph.services.tracing")
    fake_tracing_mod.traced_node = _passthrough_traced_node

    with patch.dict(
        sys.modules,
        {
            "langchain_core": mock_langchain_core,
            "langchain_core.messages": mock_messages,
            "langraph.models.answer_llm": MagicMock(answer_llm=mock_llm),
            "langraph.prompts.loader": MagicMock(load_prompt=mock_loader),
            "langraph.services.tracing": fake_tracing_mod,
        },
    ):
        mod = importlib.import_module("langraph.nodes.answer_node")
        mod.answer_llm = mock_llm
        mod.load_prompt = mock_loader
        mod.HumanMessage = mock_messages.HumanMessage
        return mod


def _make_chunks():
    """Create sample reranked chunks for testing."""
    return [
        {
            "content": "Section 1 content",
            "document_id": "doc_1",
            "title": "Contract A",
        },
        {
            "content": "Section 2 content",
            "document_id": "doc_2",
            "title": "Contract B",
        },
        {
            "content": "Section 3 content",
            "document_id": "doc_1",
            "title": "Contract A",
        },
    ]


class TestAnswerNodePromptFormatting:
    async def test_loads_rag_answer_prompt(self):
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["answer"]))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {"query": "What is X?", "reranked_chunks": _make_chunks()}
        await mod.answer_node(state)

        mock_loader.assert_called_once_with("rag_answer")

    async def test_passes_prompt_chunks_and_query_as_content_parts(self):
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["answer"]))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        chunks = _make_chunks()
        state = {"query": "What is X?", "reranked_chunks": chunks}
        await mod.answer_node(state)

        call_args = mod.HumanMessage.call_args
        content = call_args[1].get("content") or call_args[0][0]
        assert content[0] == {"type": "text", "text": "prompt text"}
        assert "<user_query>\nWhat is X?\n</user_query>" in content[1]["text"]
        assert "<document_chunks>" in content[2]["text"]
        assert json.dumps(chunks, indent=2) in content[2]["text"]

    async def test_includes_regulation_context_when_sparql_chunks_present(self):
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["answer"]))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        sparql_chunks = [{"uri": "http://example.org/reg1", "text": "Regulation 1"}]
        state = {
            "query": "What is X?",
            "reranked_chunks": _make_chunks(),
            "sparql_chunks": sparql_chunks,
        }
        await mod.answer_node(state)

        call_args = mod.HumanMessage.call_args
        content = call_args[1].get("content") or call_args[0][0]
        assert len(content) == 4
        assert "<regulation_context>" in content[3]["text"]
        assert json.dumps(sparql_chunks, indent=2) in content[3]["text"]
        assert "</regulation_context>" in content[3]["text"]
        assert "<user_query>" in content[1]["text"]

    async def test_skips_regulation_context_when_sparql_chunks_empty(self):
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["answer"]))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {
            "query": "What is X?",
            "reranked_chunks": _make_chunks(),
            "sparql_chunks": [],
        }
        await mod.answer_node(state)

        call_args = mod.HumanMessage.call_args
        content = call_args[1].get("content") or call_args[0][0]
        assert len(content) == 3
        for part in content:
            assert "<regulation_context>" not in part["text"]

    async def test_skips_regulation_context_when_sparql_chunks_missing(self):
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["answer"]))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {"query": "What is X?", "reranked_chunks": _make_chunks()}
        await mod.answer_node(state)

        call_args = mod.HumanMessage.call_args
        content = call_args[1].get("content") or call_args[0][0]
        assert len(content) == 3
        for part in content:
            assert "<regulation_context>" not in part["text"]


class TestAnswerNodeEmptyChunks:
    async def test_returns_empty_answer_when_no_chunks(self):
        mock_llm = MagicMock()
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {"query": "test", "reranked_chunks": []}
        result = await mod.answer_node(state)

        assert result["answer"] == ""
        mock_llm.astream.assert_not_called()

    async def test_returns_empty_sources_when_no_chunks(self):
        mock_llm = MagicMock()
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {"query": "test", "reranked_chunks": []}
        result = await mod.answer_node(state)

        assert result["sources"] == []

    async def test_does_not_use_callback_when_no_chunks(self):
        queue = asyncio.Queue()
        mock_llm = MagicMock()
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {
            "query": "test",
            "reranked_chunks": [],
            "token_callback": queue,
        }
        await mod.answer_node(state)

        assert queue.empty()


class TestAnswerNodeStreaming:
    async def test_streams_tokens_to_callback_queue(self):
        queue = asyncio.Queue()
        tokens = ["Hello", " ", "world"]
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(tokens))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {
            "query": "test",
            "reranked_chunks": _make_chunks(),
            "token_callback": queue,
        }
        await mod.answer_node(state)

        collected = []
        while not queue.empty():
            collected.append(queue.get_nowait())
        assert collected == ["Hello", " ", "world"]

    async def test_skips_callback_when_not_present(self):
        tokens = ["Hello"]
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(tokens))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {"query": "test", "reranked_chunks": _make_chunks()}
        result = await mod.answer_node(state)

        assert result["answer"] == "Hello"

    async def test_skips_empty_tokens_in_callback(self):
        queue = asyncio.Queue()
        chunks = _make_stream_chunks(["Hello", "", "world"])
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(return_value=_async_iter(chunks))
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {
            "query": "test",
            "reranked_chunks": _make_chunks(),
            "token_callback": queue,
        }
        await mod.answer_node(state)

        collected = []
        while not queue.empty():
            collected.append(queue.get_nowait())
        assert collected == ["Hello", "world"]

    async def test_concatenates_tokens_into_full_answer(self):
        tokens = ["The ", "answer ", "is 42."]
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(tokens))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {"query": "test", "reranked_chunks": _make_chunks()}
        result = await mod.answer_node(state)

        assert result["answer"] == "The answer is 42."


class TestAnswerNodeSourceDeduplication:
    async def test_deduplicates_sources_by_document_id(self):
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["ok"]))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {"query": "test", "reranked_chunks": _make_chunks()}
        result = await mod.answer_node(state)

        assert result["sources"] == [
            {
                "document_id": "doc_1",
                "title": "Contract A",
                "snippet": "Section 1 content",
            },
            {
                "document_id": "doc_2",
                "title": "Contract B",
                "snippet": "Section 2 content",
            },
        ]

    async def test_preserves_first_occurrence_order(self):
        chunks = [
            {"content": "a", "document_id": "z", "title": "Z Doc"},
            {"content": "b", "document_id": "a", "title": "A Doc"},
            {"content": "c", "document_id": "z", "title": "Z Doc"},
        ]
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["ok"]))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {"query": "test", "reranked_chunks": chunks}
        result = await mod.answer_node(state)

        expected_z = {
            "document_id": "z",
            "title": "Z Doc",
            "snippet": "a",
        }
        expected_a = {
            "document_id": "a",
            "title": "A Doc",
            "snippet": "b",
        }
        assert result["sources"][0] == expected_z
        assert result["sources"][1] == expected_a

    async def test_returns_empty_sources_for_single_chunk_without_id(self):
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["ok"]))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {
            "query": "test",
            "reranked_chunks": [{"content": "a", "title": "No ID"}],
        }
        result = await mod.answer_node(state)

        assert result["sources"] == []

    async def test_skips_chunks_missing_document_id(self):
        chunks = [
            {"content": "a", "title": "No ID"},
            {"content": "b", "document_id": "doc_1", "title": "With ID"},
        ]
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["ok"]))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {"query": "test", "reranked_chunks": chunks}
        result = await mod.answer_node(state)

        assert result["sources"] == [
            {"document_id": "doc_1", "title": "With ID", "snippet": "b"},
        ]


class TestAnswerNodeReturnValue:
    async def test_returns_answer_and_sources(self):
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["response"]))
        )
        mock_loader = MagicMock(return_value="prompt text")

        mod = _import_answer_node(mock_llm, mock_loader)

        state = {"query": "test", "reranked_chunks": _make_chunks()}
        result = await mod.answer_node(state)

        assert "answer" in result
        assert "sources" in result
        assert result["answer"] == "response"
        assert len(result["sources"]) == 2


class TestAnswerNodeTracing:
    def test_traced_node_decorator_applied_with_answer_name(self):
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["ok"]))
        )
        mock_loader = MagicMock(return_value="prompt text")
        mod = _import_answer_node(mock_llm, mock_loader)
        assert mod.answer_node._traced_node_name == "answer"

    async def test_node_returns_correct_result_through_decorator(self):
        mock_llm = MagicMock()
        mock_llm.astream = MagicMock(
            return_value=_async_iter(_make_stream_chunks(["response"]))
        )
        mock_loader = MagicMock(return_value="prompt text")
        mod = _import_answer_node(mock_llm, mock_loader)
        state = {"query": "test", "reranked_chunks": _make_chunks()}
        result = await mod.answer_node(state)
        assert result["answer"] == "response"
