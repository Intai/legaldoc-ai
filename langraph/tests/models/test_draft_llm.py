import importlib
import sys
from unittest.mock import MagicMock, patch


def _load_module(mock_anthropic, mock_openai):
    """Force a fresh import of models.draft_llm with mocked dependencies."""
    sys.modules.pop("langraph.models.draft_llm", None)
    with patch.dict(
        sys.modules,
        {
            "langchain_anthropic": mock_anthropic,
            "langchain_openai": mock_openai,
        },
    ):
        return importlib.import_module("langraph.models.draft_llm")


class TestDraftLlmAnthropic:
    @patch.dict(
        "os.environ",
        {"ANTHROPIC_API_KEY": "test-key"},
        clear=True,
    )
    def test_default_provider_creates_anthropic(self):
        mock_anthropic = MagicMock()
        mock_openai = MagicMock()
        mod = _load_module(mock_anthropic, mock_openai)
        mock_anthropic.ChatAnthropic.assert_called_once()
        call_kwargs = mock_anthropic.ChatAnthropic.call_args[1]
        assert call_kwargs["model"] == "claude-haiku-4-5"
        assert call_kwargs["temperature"] == 0
        assert mod.draft_llm == mock_anthropic.ChatAnthropic.return_value

    @patch.dict(
        "os.environ",
        {"LANGGRAPH_LLM_PROVIDER": "anthropic", "ANTHROPIC_API_KEY": "test-key"},
        clear=True,
    )
    def test_explicit_anthropic_provider(self):
        mock_anthropic = MagicMock()
        mock_openai = MagicMock()
        _load_module(mock_anthropic, mock_openai)
        mock_anthropic.ChatAnthropic.assert_called_once()
        call_kwargs = mock_anthropic.ChatAnthropic.call_args[1]
        assert call_kwargs["temperature"] == 0
        assert call_kwargs["api_key"] == "test-key"


class TestDraftLlmOpenRouter:
    @patch.dict(
        "os.environ",
        {"LANGGRAPH_LLM_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "or-key"},
        clear=True,
    )
    def test_openrouter_provider_creates_openai(self):
        mock_anthropic = MagicMock()
        mock_openai = MagicMock()
        mod = _load_module(mock_anthropic, mock_openai)
        mock_openai.ChatOpenAI.assert_called_once()
        call_kwargs = mock_openai.ChatOpenAI.call_args[1]
        assert call_kwargs["temperature"] == 0
        assert call_kwargs["base_url"] == "https://openrouter.ai/api/v1"
        assert call_kwargs["api_key"] == "or-key"
        assert mod.draft_llm == mock_openai.ChatOpenAI.return_value
