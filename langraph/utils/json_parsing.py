import re


def strip_fences(text: str) -> str:
    """Strip markdown code fences from LLM responses."""
    return re.sub(r"^```(?:json)?\s*\n?", "", text).rstrip("`").strip()
