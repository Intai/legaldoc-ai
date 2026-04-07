import base64
import importlib
import sys
from unittest.mock import MagicMock, patch


def _load_module(mock_anthropic, mock_openai, mock_google=None):
    """Force a fresh import of models.llm_factory with mocked dependencies."""
    sys.modules.pop("langraph.models.llm_factory", None)
    mocks = {
        "langchain_anthropic": mock_anthropic,
        "langchain_openai": mock_openai,
        "langchain_google_genai": mock_google or MagicMock(),
    }
    with patch.dict(sys.modules, mocks):
        return importlib.import_module("langraph.models.llm_factory")


class TestCreateLlmAnthropic:
    @patch.dict(
        "os.environ",
        {"ANTHROPIC_API_KEY": "test-key"},
        clear=True,
    )
    def test_default_provider_creates_anthropic(self):
        mock_anthropic = MagicMock()
        mock_openai = MagicMock()
        mod = _load_module(mock_anthropic, mock_openai)
        result = mod.create_llm()
        mock_anthropic.ChatAnthropic.assert_called_once_with(
            model="claude-haiku-4-5",
            temperature=0,
            api_key="test-key",
        )
        assert result == mock_anthropic.ChatAnthropic.return_value

    @patch.dict(
        "os.environ",
        {"LANGGRAPH_LLM_PROVIDER": "anthropic", "ANTHROPIC_API_KEY": "test-key"},
        clear=True,
    )
    def test_explicit_anthropic_provider(self):
        mock_anthropic = MagicMock()
        mock_openai = MagicMock()
        mod = _load_module(mock_anthropic, mock_openai)
        mod.create_llm()
        call_kwargs = mock_anthropic.ChatAnthropic.call_args[1]
        assert call_kwargs["temperature"] == 0
        assert call_kwargs["api_key"] == "test-key"


class TestCreateLlmOpenRouter:
    @patch.dict(
        "os.environ",
        {"LANGGRAPH_LLM_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "or-key"},
        clear=True,
    )
    def test_openrouter_provider_creates_openai(self):
        mock_anthropic = MagicMock()
        mock_openai = MagicMock()
        mod = _load_module(mock_anthropic, mock_openai)
        result = mod.create_llm()
        mock_openai.ChatOpenAI.assert_called_once_with(
            model="nvidia/nemotron-3-nano-30b-a3b:free",
            temperature=0,
            base_url="https://openrouter.ai/api/v1",
            api_key="or-key",
        )
        assert result == mock_openai.ChatOpenAI.return_value


class TestCreateLlmGoogle:
    @patch.dict(
        "os.environ",
        {"LANGGRAPH_LLM_PROVIDER": "google", "GOOGLE_API_KEY": "g-key"},
        clear=True,
    )
    def test_google_provider_creates_google_genai(self):
        mock_anthropic = MagicMock()
        mock_openai = MagicMock()
        mock_google = MagicMock()
        mod = _load_module(mock_anthropic, mock_openai, mock_google)
        result = mod.create_llm()
        mock_google.ChatGoogleGenerativeAI.assert_called_once_with(
            model="gemini-2.5-flash-lite",
            temperature=0,
            api_key="g-key",
        )
        assert result == mock_google.ChatGoogleGenerativeAI.return_value

    @patch.dict(
        "os.environ",
        {"LANGGRAPH_LLM_PROVIDER": "google", "GOOGLE_API_KEY": "g-key"},
        clear=True,
    )
    def test_custom_model_google(self):
        mock_anthropic = MagicMock()
        mock_openai = MagicMock()
        mock_google = MagicMock()
        mod = _load_module(mock_anthropic, mock_openai, mock_google)
        mod.create_llm(model="gemini-2.5-flash")
        call_kwargs = mock_google.ChatGoogleGenerativeAI.call_args[1]
        assert call_kwargs["model"] == "gemini-2.5-flash"


class TestCreateLlmOverrides:
    @patch.dict(
        "os.environ",
        {"ANTHROPIC_API_KEY": "test-key"},
        clear=True,
    )
    def test_custom_temperature(self):
        mock_anthropic = MagicMock()
        mock_openai = MagicMock()
        mod = _load_module(mock_anthropic, mock_openai)
        mod.create_llm(temperature=0.7)
        call_kwargs = mock_anthropic.ChatAnthropic.call_args[1]
        assert call_kwargs["temperature"] == 0.7

    @patch.dict(
        "os.environ",
        {"ANTHROPIC_API_KEY": "test-key"},
        clear=True,
    )
    def test_custom_model(self):
        mock_anthropic = MagicMock()
        mock_openai = MagicMock()
        mod = _load_module(mock_anthropic, mock_openai)
        mod.create_llm(model="claude-sonnet-4-5")
        call_kwargs = mock_anthropic.ChatAnthropic.call_args[1]
        assert call_kwargs["model"] == "claude-sonnet-4-5"

    @patch.dict(
        "os.environ",
        {"LANGGRAPH_LLM_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "or-key"},
        clear=True,
    )
    def test_custom_model_openrouter(self):
        mock_anthropic = MagicMock()
        mock_openai = MagicMock()
        mod = _load_module(mock_anthropic, mock_openai)
        mod.create_llm(model="meta-llama/llama-3-8b")
        call_kwargs = mock_openai.ChatOpenAI.call_args[1]
        assert call_kwargs["model"] == "meta-llama/llama-3-8b"


class TestCreatePdfContent:
    PDF_BYTES = b"%PDF-1.4 test"

    @patch.dict("os.environ", {}, clear=True)
    def test_default_provider_returns_document_type(self):
        mod = _load_module(MagicMock(), MagicMock())
        result = mod.create_pdf_content(self.PDF_BYTES)
        encoded = base64.b64encode(self.PDF_BYTES).decode("utf-8")
        assert result == {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": encoded,
            },
        }

    @patch.dict(
        "os.environ",
        {"LANGGRAPH_LLM_PROVIDER": "google"},
        clear=True,
    )
    def test_google_provider_returns_file_type(self):
        mod = _load_module(MagicMock(), MagicMock())
        result = mod.create_pdf_content(self.PDF_BYTES)
        encoded = base64.b64encode(self.PDF_BYTES).decode("utf-8")
        assert result == {
            "type": "file",
            "source_type": "base64",
            "mime_type": "application/pdf",
            "data": encoded,
        }

    @patch.dict(
        "os.environ",
        {"LANGGRAPH_LLM_PROVIDER": "openrouter"},
        clear=True,
    )
    def test_openrouter_provider_returns_document_type(self):
        mod = _load_module(MagicMock(), MagicMock())
        result = mod.create_pdf_content(self.PDF_BYTES)
        assert result["type"] == "document"
