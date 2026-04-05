import os

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI


def create_llm(*, temperature=0, model=None):
    """Create an LLM instance based on the configured provider.

    Keyword Args:
        temperature: Sampling temperature (default 0).
        model: Override the default model name for the provider.
    """
    provider = os.environ.get("LANGGRAPH_LLM_PROVIDER", "anthropic")

    if provider == "openrouter":
        return ChatOpenAI(
            model=model or "nvidia/nemotron-3-nano-30b-a3b:free",
            temperature=temperature,
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ["OPENROUTER_API_KEY"],
        )

    return ChatAnthropic(
        model=model or "claude-haiku-4-5",
        temperature=temperature,
        api_key=os.environ.get("ANTHROPIC_API_KEY"),
    )
