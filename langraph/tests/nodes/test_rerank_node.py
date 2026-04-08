import json
import sys
from types import ModuleType
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_rerank_result(indices):
    """Create a fake RerankResult-like object."""
    result = MagicMock()
    result.indices = indices
    return result


@pytest.fixture()
def mock_result():
    """Build a fake structured result returning indices [2, 0, 4, 1, 3]."""
    return _make_rerank_result([2, 0, 4, 1, 3])


@pytest.fixture()
def mock_structured_llm(mock_result):
    structured = AsyncMock()
    structured.ainvoke.return_value = mock_result
    return structured


@pytest.fixture()
def mock_llm(mock_structured_llm):
    llm = MagicMock()
    llm.with_structured_output.return_value = mock_structured_llm
    return llm


@pytest.fixture()
def sample_chunks():
    return [
        {"text": "chunk0", "source": "doc_a"},
        {"text": "chunk1", "source": "doc_b"},
        {"text": "chunk2", "source": "doc_c"},
        {"text": "chunk3", "source": "doc_d"},
        {"text": "chunk4", "source": "doc_e"},
        {"text": "chunk5", "source": "doc_f"},
    ]


@pytest.fixture()
def sample_sparql_chunks():
    return [
        {"text": "regulation A", "source": "sparql_a"},
        {"text": "regulation B", "source": "sparql_b"},
    ]


@pytest.fixture()
def rerank_module(mock_llm):
    """Import nodes.rerank_node with all external deps mocked."""
    fake_lc_core = ModuleType("langchain_core")
    fake_lc_messages = ModuleType("langchain_core.messages")

    class FakeHumanMessage:
        def __init__(self, content):
            self.content = content

    fake_lc_messages.HumanMessage = FakeHumanMessage
    fake_lc_core.messages = fake_lc_messages

    fake_rerank_llm_mod = ModuleType("langraph.models.rerank_llm")
    fake_rerank_llm_mod.rerank_llm = mock_llm

    mock_load_prompt = MagicMock(
        return_value="prompt text"
    )
    fake_loader_mod = ModuleType("langraph.prompts.loader")
    fake_loader_mod.load_prompt = mock_load_prompt

    sys.modules.pop("langraph.nodes.rerank_node", None)

    with patch.dict(
        sys.modules,
        {
            "langchain_core": fake_lc_core,
            "langchain_core.messages": fake_lc_messages,
            "langraph.models.rerank_llm": fake_rerank_llm_mod,
            "langraph.prompts.loader": fake_loader_mod,
        },
    ):
        import importlib

        mod = importlib.import_module("langraph.nodes.rerank_node")
        mod._mock_load_prompt = mock_load_prompt
        mod._FakeHumanMessage = FakeHumanMessage
        yield mod

    sys.modules.pop("langraph.nodes.rerank_node", None)


class TestReranknodePrompt:
    async def test_loads_rerank_prompt(self, rerank_module, sample_chunks):
        state = {"query": "test query", "vector_chunks": sample_chunks}
        await rerank_module.rerank_node(state)
        rerank_module._mock_load_prompt.assert_called_once_with("rerank")

    async def test_passes_prompt_query_and_chunks_as_content_parts(
        self, rerank_module, mock_structured_llm, sample_chunks
    ):
        state = {"query": "liability clause", "vector_chunks": sample_chunks}
        await rerank_module.rerank_node(state)
        message = mock_structured_llm.ainvoke.call_args[0][0][0]
        content = message.content
        assert content[0] == {"type": "text", "text": "prompt text"}
        assert "<user_query>\nliability clause\n</user_query>" in content[1]["text"]
        expected = json.dumps(sample_chunks, indent=2)
        tag = f"<document_chunks>\n{expected}\n</document_chunks>"
        assert tag in content[2]["text"]

    async def test_includes_sparql_chunks_as_regulation_context(
        self,
        rerank_module,
        mock_structured_llm,
        sample_chunks,
        sample_sparql_chunks,
    ):
        state = {
            "query": "q",
            "vector_chunks": sample_chunks,
            "sparql_chunks": sample_sparql_chunks,
        }
        await rerank_module.rerank_node(state)
        message = mock_structured_llm.ainvoke.call_args[0][0][0]
        content = message.content
        assert len(content) == 4
        expected = json.dumps(sample_sparql_chunks, indent=2)
        tag = f"<regulation_context>\n{expected}\n</regulation_context>"
        assert tag in content[3]["text"]

    async def test_omits_regulation_context_when_sparql_missing(
        self, rerank_module, mock_structured_llm, sample_chunks
    ):
        state = {"query": "q", "vector_chunks": sample_chunks}
        await rerank_module.rerank_node(state)
        message = mock_structured_llm.ainvoke.call_args[0][0][0]
        content = message.content
        assert len(content) == 3


class TestReranknodeLlmInvocation:
    async def test_with_structured_output_called_with_schema(
        self, rerank_module, mock_llm, sample_chunks
    ):
        state = {"query": "q", "vector_chunks": sample_chunks}
        await rerank_module.rerank_node(state)
        mock_llm.with_structured_output.assert_called_once_with(
            rerank_module.RerankResult
        )

    async def test_ainvoke_called_with_single_message(
        self, rerank_module, mock_structured_llm, sample_chunks
    ):
        state = {"query": "q", "vector_chunks": sample_chunks}
        await rerank_module.rerank_node(state)
        args = mock_structured_llm.ainvoke.call_args[0][0]
        assert len(args) == 1
        assert isinstance(args[0], rerank_module._FakeHumanMessage)


class TestReranknodeReturnValue:
    async def test_returns_top5_chunks_in_order(
        self, rerank_module, sample_chunks
    ):
        state = {"query": "q", "vector_chunks": sample_chunks}
        result = await rerank_module.rerank_node(state)
        assert result == {
            "reranked_chunks": [
                sample_chunks[2],
                sample_chunks[0],
                sample_chunks[4],
                sample_chunks[1],
                sample_chunks[3],
            ],
        }

    async def test_truncates_to_top5_when_more_indices_returned(
        self, rerank_module, mock_structured_llm, sample_chunks
    ):
        mock_structured_llm.ainvoke.return_value = _make_rerank_result(
            [0, 1, 2, 3, 4, 5]
        )
        state = {"query": "q", "vector_chunks": sample_chunks}
        result = await rerank_module.rerank_node(state)
        assert len(result["reranked_chunks"]) == 5

    async def test_returns_fewer_when_llm_returns_fewer_indices(
        self, rerank_module, mock_structured_llm, sample_chunks
    ):
        mock_structured_llm.ainvoke.return_value = _make_rerank_result([1, 3])
        state = {"query": "q", "vector_chunks": sample_chunks}
        result = await rerank_module.rerank_node(state)
        assert result == {
            "reranked_chunks": [sample_chunks[1], sample_chunks[3]],
        }

    async def test_filters_out_of_bounds_indices(
        self, rerank_module, mock_structured_llm, sample_chunks
    ):
        mock_structured_llm.ainvoke.return_value = _make_rerank_result(
            [0, 99, -1, 2]
        )
        state = {"query": "q", "vector_chunks": sample_chunks}
        result = await rerank_module.rerank_node(state)
        assert result == {
            "reranked_chunks": [sample_chunks[0], sample_chunks[2]],
        }

    async def test_returns_empty_when_llm_returns_empty_array(
        self, rerank_module, mock_structured_llm, sample_chunks
    ):
        mock_structured_llm.ainvoke.return_value = _make_rerank_result([])
        state = {"query": "q", "vector_chunks": sample_chunks}
        result = await rerank_module.rerank_node(state)
        assert result == {"reranked_chunks": []}

    async def test_indices_refer_to_vector_chunks_not_sparql(
        self,
        rerank_module,
        mock_structured_llm,
        sample_chunks,
        sample_sparql_chunks,
    ):
        mock_structured_llm.ainvoke.return_value = _make_rerank_result([0, 1])
        state = {
            "query": "q",
            "vector_chunks": sample_chunks,
            "sparql_chunks": sample_sparql_chunks,
        }
        result = await rerank_module.rerank_node(state)
        assert result == {
            "reranked_chunks": [sample_chunks[0], sample_chunks[1]],
        }
