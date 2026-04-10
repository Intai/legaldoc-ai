import asyncio
import functools
import importlib
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


def _make_human_message_class():
    """Create a fake HumanMessage class that stores content."""

    class FakeHumanMessage:
        def __init__(self, content):
            self.content = content

    return FakeHumanMessage


@pytest.fixture()
def langchain_core_mock():
    """Provide a mock langchain_core.messages module."""
    mod = ModuleType("langchain_core")
    messages_mod = ModuleType("langchain_core.messages")
    mod.messages = messages_mod
    messages_mod.HumanMessage = _make_human_message_class()
    return mod, messages_mod


@pytest.fixture()
def mock_result():
    """Build a fake FinalizeResult-like object."""
    section = MagicMock()
    section.model_dump.return_value = {
        "heading": "Introduction",
        "content": [{"type": "paragraph", "text": "Hello world."}],
    }

    result = MagicMock()
    result.sections = [section]
    result.description = "A brief summary."
    return result


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
def finalize_module(langchain_core_mock, mock_llm):
    """Import nodes.finalize_node with mocked dependencies."""
    core_mod, messages_mod = langchain_core_mock

    # Create a fake finalize_llm module so the import chain works
    fake_finalize_llm_mod = ModuleType("langraph.models.finalize_llm")
    fake_finalize_llm_mod.finalize_llm = mock_llm

    fake_tracing_mod = ModuleType("langraph.services.tracing")
    fake_tracing_mod.traced_node = _passthrough_traced_node

    sys.modules.pop("langraph.nodes.finalize_node", None)

    with patch.dict(
        sys.modules,
        {
            "langchain_core": core_mod,
            "langchain_core.messages": messages_mod,
            "langraph.models.finalize_llm": fake_finalize_llm_mod,
            "langraph.services.tracing": fake_tracing_mod,
        },
    ), patch(
        "langraph.prompts.loader.load_prompt", return_value="Finalize prompt"
    ) as mock_prompt:
        mod = importlib.import_module("langraph.nodes.finalize_node")
        mod.finalize_llm = mock_llm
        mod.load_prompt = mock_prompt
        mod.HumanMessage = messages_mod.HumanMessage
        yield mod


class TestFinalizeNodePhaseCallback:
    async def test_emits_finalizing_phase(self, finalize_module):
        queue = asyncio.Queue()
        state = {
            "draft": "Draft content here.",
            "title": "Test Document",
            "doc_type": "contract",
            "phase_callback": queue,
        }
        await finalize_module.finalize_node(state)
        assert queue.get_nowait() == "finalizing"

    async def test_emits_ready_tuple_after_finalizing(
        self, finalize_module, mock_result
    ):
        queue = asyncio.Queue()
        state = {
            "draft": "Draft content here.",
            "title": "Test Document",
            "doc_type": "contract",
            "phase_callback": queue,
        }
        await finalize_module.finalize_node(state)
        # First item is "finalizing"
        queue.get_nowait()
        # Second item is the "ready" tuple
        phase, payload = queue.get_nowait()
        assert phase == "ready"
        assert payload == {
            "title": "Test Document",
            "sections": [
                {
                    "heading": "Introduction",
                    "content": [{"type": "paragraph", "text": "Hello world."}],
                }
            ],
            "doc_type": "contract",
            "description": "A brief summary.",
        }

    async def test_no_error_without_phase_callback(self, finalize_module):
        state = {
            "draft": "Draft content here.",
            "title": "Test Document",
        }
        result = await finalize_module.finalize_node(state)
        assert result is not None


class TestFinalizeNodeMessageConstruction:
    async def test_prompt_loaded_with_finalize_name(self, finalize_module):
        state = {"draft": "Draft text.", "title": "Title"}
        await finalize_module.finalize_node(state)
        finalize_module.load_prompt.assert_called_once_with("finalize")

    async def test_message_has_three_text_blocks(
        self, finalize_module, mock_structured_llm
    ):
        state = {"draft": "Draft text.", "title": "My Title"}
        await finalize_module.finalize_node(state)
        message = mock_structured_llm.ainvoke.call_args[0][0][0]
        assert len(message.content) == 3
        assert message.content[0] == {"type": "text", "text": "Finalize prompt"}
        assert message.content[1] == {"type": "text", "text": "Draft text."}
        assert message.content[2] == {"type": "text", "text": "My Title"}


class TestFinalizeNodeLlmInvocation:
    async def test_with_structured_output_called_with_schema(
        self, finalize_module, mock_llm
    ):
        state = {"draft": "d", "title": "t"}
        await finalize_module.finalize_node(state)
        mock_llm.with_structured_output.assert_called_once_with(
            finalize_module.FinalizeResult
        )

    async def test_ainvoke_called_with_single_message_list(
        self, finalize_module, mock_structured_llm
    ):
        state = {"draft": "d", "title": "t"}
        await finalize_module.finalize_node(state)
        args = mock_structured_llm.ainvoke.call_args[0][0]
        assert len(args) == 1
        assert isinstance(args[0], finalize_module.HumanMessage)


class TestFinalizeNodeReturnValue:
    async def test_returns_sections_and_description(
        self, finalize_module, mock_result
    ):
        state = {"draft": "d", "title": "t"}
        result = await finalize_module.finalize_node(state)
        assert result == {
            "sections": [
                {
                    "heading": "Introduction",
                    "content": [{"type": "paragraph", "text": "Hello world."}],
                }
            ],
            "description": "A brief summary.",
        }


class TestFinalizeNodeTracing:
    def test_traced_node_decorator_applied_with_finalize_name(self, finalize_module):
        assert finalize_module.finalize_node._traced_node_name == "finalize"

    async def test_node_returns_correct_result_through_decorator(
        self, finalize_module
    ):
        state = {"draft": "d", "title": "t"}
        result = await finalize_module.finalize_node(state)
        assert "sections" in result
        assert "description" in result
