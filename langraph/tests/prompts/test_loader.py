import pytest

from langraph.prompts.loader import load_prompt


def test_load_prompt_returns_file_content():
    content = load_prompt("analyze")
    assert isinstance(content, str)
    assert "legal document analyst" in content


def test_load_prompt_missing_file_raises():
    with pytest.raises(FileNotFoundError):
        load_prompt("nonexistent")
