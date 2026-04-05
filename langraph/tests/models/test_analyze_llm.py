import importlib
import sys
from unittest.mock import MagicMock, patch


def test_analyze_llm_uses_factory():
    mock_factory = MagicMock()
    sys.modules.pop("langraph.models.analyze_llm", None)
    with patch.dict(
        sys.modules, {"langraph.models.llm_factory": mock_factory}
    ):
        mod = importlib.import_module("langraph.models.analyze_llm")
    mock_factory.create_llm.assert_called_once()
    assert mod.analyze_llm == mock_factory.create_llm.return_value
