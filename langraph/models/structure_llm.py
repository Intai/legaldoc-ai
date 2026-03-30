import os

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI

provider = os.environ.get("LANGGRAPH_LLM_PROVIDER", "anthropic")

if provider == "openrouter":
    structure_llm = ChatOpenAI(
        model="nvidia/nemotron-3-nano-30b-a3b:free",
        temperature=0,
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ["OPENROUTER_API_KEY"],
    )
else:
    structure_llm = ChatAnthropic(
        model="claude-haiku-4-5",
        temperature=0,
        api_key=os.environ.get("ANTHROPIC_API_KEY"),
    )
