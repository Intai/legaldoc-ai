import asyncio
import importlib
import sys
from unittest.mock import AsyncMock, MagicMock, patch


def _import_draft_node(mock_llm, mock_loader):
    """Import draft_node with mocked dependencies."""
    sys.modules.pop("langraph.nodes.draft_node", None)
    sys.modules.pop("nodes.draft_node", None)

    mock_messages = MagicMock()
    mock_langchain_core = MagicMock()
    mock_langchain_core.messages = mock_messages

    with patch.dict(
        sys.modules,
        {
            "langchain_core": mock_langchain_core,
            "langchain_core.messages": mock_messages,
            "langraph.models.draft_llm": MagicMock(draft_llm=mock_llm),
            "langraph.prompts.loader": MagicMock(load_prompt=mock_loader),
        },
    ):
        mod = importlib.import_module("langraph.nodes.draft_node")
        # Replace module-level references with our mocks
        mod.draft_llm = mock_llm
        mod.load_prompt = mock_loader
        mod.HumanMessage = mock_messages.HumanMessage
        return mod


class TestDraftNodePhaseCallback:
    async def test_emits_drafting_phase(self):
        queue = asyncio.Queue()
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="draft"))
        mock_loader = MagicMock(return_value="prompt")

        mod = _import_draft_node(mock_llm, mock_loader)

        state = {
            "outline": "outline text",
            "analysis": "analysis text",
            "phase_callback": queue,
        }
        await mod.draft_node(state)

        assert queue.get_nowait() == "drafting"

    async def test_skips_phase_when_no_callback(self):
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="draft"))
        mock_loader = MagicMock(return_value="prompt")

        mod = _import_draft_node(mock_llm, mock_loader)

        state = {
            "outline": "outline text",
            "analysis": "analysis text",
        }
        result = await mod.draft_node(state)

        assert result == {"draft": "draft"}


class TestDraftNodeMessageConstruction:
    async def test_builds_message_with_three_text_blocks(self):
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="result"))
        mock_loader = MagicMock(return_value="my prompt")

        mod = _import_draft_node(mock_llm, mock_loader)

        state = {
            "outline": "my outline",
            "analysis": "my analysis",
        }
        await mod.draft_node(state)

        mod.HumanMessage.assert_called_once_with(
            content=[
                {"type": "text", "text": "my prompt"},
                {"type": "text", "text": "my outline"},
                {"type": "text", "text": "my analysis"},
            ]
        )

    async def test_passes_message_list_to_llm(self):
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="result"))
        mock_loader = MagicMock(return_value="prompt")

        mod = _import_draft_node(mock_llm, mock_loader)

        state = {
            "outline": "outline",
            "analysis": "analysis",
        }
        await mod.draft_node(state)

        args = mock_llm.ainvoke.call_args[0][0]
        assert len(args) == 1
        assert args[0] == mod.HumanMessage.return_value


class TestDraftNodeLlmInvocation:
    async def test_invokes_llm_once(self):
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="text"))
        mock_loader = MagicMock(return_value="p")

        mod = _import_draft_node(mock_llm, mock_loader)

        state = {
            "outline": "outline",
            "analysis": "analysis",
        }
        await mod.draft_node(state)

        mock_llm.ainvoke.assert_awaited_once()

    async def test_loads_draft_prompt(self):
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="text"))
        mock_loader = MagicMock(return_value="p")

        mod = _import_draft_node(mock_llm, mock_loader)

        state = {
            "outline": "outline",
            "analysis": "analysis",
        }
        await mod.draft_node(state)

        mock_loader.assert_called_once_with("draft")


class TestDraftNodeReturnValue:
    async def test_returns_draft_dict(self):
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(
            return_value=MagicMock(content="final draft text")
        )
        mock_loader = MagicMock(return_value="p")

        mod = _import_draft_node(mock_llm, mock_loader)

        state = {
            "outline": "outline",
            "analysis": "analysis",
        }
        result = await mod.draft_node(state)

        assert result == {"draft": "final draft text"}
