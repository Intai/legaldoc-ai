import importlib
import sys
from unittest.mock import MagicMock, patch


def test_parse_llm_uses_factory():
    mock_factory = MagicMock()
    sys.modules.pop("langraph.models.parse_llm", None)
    with patch.dict(
        sys.modules, {"langraph.models.llm_factory": mock_factory}
    ):
        mod = importlib.import_module("langraph.models.parse_llm")
    mock_factory.create_llm.assert_called_once()
    assert mod.parse_llm == mock_factory.create_llm.return_value
