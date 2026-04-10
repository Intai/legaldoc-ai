"""Tests for the tracing decorator."""

from unittest.mock import MagicMock, patch

from langraph.services.tracing import traced_node


async def test_creates_span_with_node_name():
    """The decorator creates a span named langraph.node.{name}."""
    mock_span = MagicMock()
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value.__enter__ = MagicMock(
        return_value=mock_span
    )
    mock_tracer.start_as_current_span.return_value.__exit__ = MagicMock(
        return_value=False
    )

    @traced_node("analyze")
    async def my_node(state: dict) -> dict:
        return {"result": "ok"}

    with patch("langraph.services.tracing.tracer", mock_tracer):
        await my_node({"graph": "doc_gen"})

    mock_tracer.start_as_current_span.assert_called_once_with(
        "langraph.node.analyze"
    )


async def test_sets_node_name_attribute():
    """The span receives the langraph.node.name attribute."""
    mock_span = MagicMock()
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value.__enter__ = MagicMock(
        return_value=mock_span
    )
    mock_tracer.start_as_current_span.return_value.__exit__ = MagicMock(
        return_value=False
    )

    @traced_node("draft")
    async def my_node(state: dict) -> dict:
        return {}

    with patch("langraph.services.tracing.tracer", mock_tracer):
        await my_node({"graph": "doc_gen"})

    mock_span.set_attribute.assert_any_call("langraph.node.name", "draft")


async def test_sets_graph_attribute_from_state():
    """The span receives the langraph.graph attribute from state."""
    mock_span = MagicMock()
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value.__enter__ = MagicMock(
        return_value=mock_span
    )
    mock_tracer.start_as_current_span.return_value.__exit__ = MagicMock(
        return_value=False
    )

    @traced_node("retrieve")
    async def my_node(state: dict) -> dict:
        return {}

    with patch("langraph.services.tracing.tracer", mock_tracer):
        await my_node({"graph": "rag_pipeline"})

    mock_span.set_attribute.assert_any_call("langraph.graph", "rag_pipeline")


async def test_graph_attribute_defaults_to_empty_string():
    """When state has no graph key, the attribute defaults to empty string."""
    mock_span = MagicMock()
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value.__enter__ = MagicMock(
        return_value=mock_span
    )
    mock_tracer.start_as_current_span.return_value.__exit__ = MagicMock(
        return_value=False
    )

    @traced_node("ingest")
    async def my_node(state: dict) -> dict:
        return {}

    with patch("langraph.services.tracing.tracer", mock_tracer):
        await my_node({})

    mock_span.set_attribute.assert_any_call("langraph.graph", "")


async def test_returns_wrapped_function_result():
    """The decorator returns the result of the wrapped function."""
    mock_span = MagicMock()
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value.__enter__ = MagicMock(
        return_value=mock_span
    )
    mock_tracer.start_as_current_span.return_value.__exit__ = MagicMock(
        return_value=False
    )

    @traced_node("finalize")
    async def my_node(state: dict) -> dict:
        return {"doc": "content"}

    with patch("langraph.services.tracing.tracer", mock_tracer):
        result = await my_node({"graph": "gen"})

    assert result == {"doc": "content"}


async def test_preserves_wrapped_function_name():
    """The decorator preserves the original function name via functools.wraps."""

    @traced_node("structure")
    async def structure_node(state: dict) -> dict:
        return {}

    assert structure_node.__name__ == "structure_node"


async def test_passes_state_to_wrapped_function():
    """The decorator passes the state argument to the wrapped function."""
    received_state = {}

    mock_span = MagicMock()
    mock_tracer = MagicMock()
    mock_tracer.start_as_current_span.return_value.__enter__ = MagicMock(
        return_value=mock_span
    )
    mock_tracer.start_as_current_span.return_value.__exit__ = MagicMock(
        return_value=False
    )

    @traced_node("rerank")
    async def my_node(state: dict) -> dict:
        received_state.update(state)
        return {}

    input_state = {"graph": "test", "data": [1, 2, 3]}

    with patch("langraph.services.tracing.tracer", mock_tracer):
        await my_node(input_state)

    assert received_state == input_state
