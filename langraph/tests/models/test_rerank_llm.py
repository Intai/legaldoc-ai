import importlib
import sys
from unittest.mock import MagicMock, patch


def test_rerank_llm_uses_factory():
    mock_factory = MagicMock()
    sys.modules.pop("langraph.models.rerank_llm", None)
    with patch.dict(
        sys.modules, {"langraph.models.llm_factory": mock_factory}
    ):
        mod = importlib.import_module("langraph.models.rerank_llm")
    mock_factory.create_llm.assert_called_once()
    assert mod.rerank_llm == mock_factory.create_llm.return_value
