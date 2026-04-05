import json
import sys
from types import ModuleType
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture()
def mock_response():
    """Build a fake LLM response returning indices [2, 0, 4, 1, 3]."""
    response = MagicMock()
    response.content = json.dumps([2, 0, 4, 1, 3])
    return response


@pytest.fixture()
def mock_llm(mock_response):
    llm = AsyncMock()
    llm.ainvoke.return_value = mock_response
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
        state = {"query": "test query", "retrieved_chunks": sample_chunks}
        await rerank_module.rerank_node(state)
        rerank_module._mock_load_prompt.assert_called_once_with("rerank")

    async def test_passes_prompt_query_and_chunks_as_content_parts(
        self, rerank_module, mock_llm, sample_chunks
    ):
        state = {"query": "liability clause", "retrieved_chunks": sample_chunks}
        await rerank_module.rerank_node(state)
        message = mock_llm.ainvoke.call_args[0][0][0]
        content = message.content
        assert content[0] == {"type": "text", "text": "prompt text"}
        assert "<user_query>\nliability clause\n</user_query>" in content[1]["text"]
        expected = json.dumps(sample_chunks, indent=2)
        assert content[2] == {"type": "text", "text": expected}


class TestReranknodeLlmInvocation:
    async def test_ainvoke_called_with_single_message(
        self, rerank_module, mock_llm, sample_chunks
    ):
        state = {"query": "q", "retrieved_chunks": sample_chunks}
        await rerank_module.rerank_node(state)
        args = mock_llm.ainvoke.call_args[0][0]
        assert len(args) == 1
        assert isinstance(args[0], rerank_module._FakeHumanMessage)


class TestReranknodeReturnValue:
    async def test_returns_top5_chunks_in_order(
        self, rerank_module, sample_chunks
    ):
        state = {"query": "q", "retrieved_chunks": sample_chunks}
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
        self, rerank_module, mock_llm, mock_response, sample_chunks
    ):
        mock_response.content = json.dumps([0, 1, 2, 3, 4, 5])
        state = {"query": "q", "retrieved_chunks": sample_chunks}
        result = await rerank_module.rerank_node(state)
        assert len(result["reranked_chunks"]) == 5

    async def test_returns_fewer_when_llm_returns_fewer_indices(
        self, rerank_module, mock_llm, mock_response, sample_chunks
    ):
        mock_response.content = json.dumps([1, 3])
        state = {"query": "q", "retrieved_chunks": sample_chunks}
        result = await rerank_module.rerank_node(state)
        assert result == {
            "reranked_chunks": [sample_chunks[1], sample_chunks[3]],
        }

    async def test_filters_out_of_bounds_indices(
        self, rerank_module, mock_llm, mock_response, sample_chunks
    ):
        mock_response.content = json.dumps([0, 99, -1, 2])
        state = {"query": "q", "retrieved_chunks": sample_chunks}
        result = await rerank_module.rerank_node(state)
        assert result == {
            "reranked_chunks": [sample_chunks[0], sample_chunks[2]],
        }

    async def test_returns_empty_when_llm_returns_empty_array(
        self, rerank_module, mock_llm, mock_response, sample_chunks
    ):
        mock_response.content = json.dumps([])
        state = {"query": "q", "retrieved_chunks": sample_chunks}
        result = await rerank_module.rerank_node(state)
        assert result == {"reranked_chunks": []}
