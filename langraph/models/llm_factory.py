import base64
import os

from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI


def _get_provider():
    return os.environ.get("LANGGRAPH_LLM_PROVIDER", "anthropic")


def create_llm(*, temperature=0, model=None):
    """Create an LLM instance based on the configured provider.

    Keyword Args:
        temperature: Sampling temperature (default 0).
        model: Override the default model name for the provider.
    """
    provider = _get_provider()

    if provider == "openrouter":
        return ChatOpenAI(
            model=model or "nvidia/nemotron-3-nano-30b-a3b:free",
            temperature=temperature,
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ["OPENROUTER_API_KEY"],
        )

    if provider == "google":
        return ChatGoogleGenerativeAI(
            model=model or "gemini-2.5-flash-lite",
            temperature=temperature,
            api_key=os.environ["GOOGLE_API_KEY"],
        )

    return ChatAnthropic(
        model=model or "claude-haiku-4-5",
        temperature=temperature,
        api_key=os.environ.get("ANTHROPIC_API_KEY"),
    )


def create_pdf_content(data: bytes):
    """Create a PDF content part for the current LLM provider.

    Args:
        data: Raw PDF bytes.
    """
    encoded = base64.b64encode(data).decode("utf-8")

    if _get_provider() == "google":
        return {
            "type": "file",
            "source_type": "base64",
            "mime_type": "application/pdf",
            "data": encoded,
        }

    return {
        "type": "document",
        "source": {
            "type": "base64",
            "media_type": "application/pdf",
            "data": encoded,
        },
    }
