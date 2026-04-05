import importlib
import sys
from unittest.mock import MagicMock, patch


def test_answer_llm_uses_factory():
    mock_factory = MagicMock()
    sys.modules.pop("langraph.models.answer_llm", None)
    with patch.dict(
        sys.modules, {"langraph.models.llm_factory": mock_factory}
    ):
        mod = importlib.import_module("langraph.models.answer_llm")
    mock_factory.create_llm.assert_called_once()
    assert mod.answer_llm == mock_factory.create_llm.return_value
