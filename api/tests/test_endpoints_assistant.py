"""Tests for the assistant API endpoints."""

import json
import sys
import types
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import create_app

# Pre-seed sys.modules with mock langraph modules to prevent importing
# the real modules (which require API keys).
if "langraph" not in sys.modules:
    sys.modules["langraph"] = types.ModuleType("langraph")
if "langraph.app" not in sys.modules:
    sys.modules["langraph.app"] = types.ModuleType("langraph.app")
_mock_rag_graph_module = types.ModuleType("langraph.app.rag_graph")
_mock_rag_graph_module.build_rag_graph = MagicMock()  # type: ignore[attr-defined]
sys.modules["langraph.app.rag_graph"] = _mock_rag_graph_module
# Also seed graph module so documents endpoint import doesn't fail.
if "langraph.app.graph" not in sys.modules:
    _mock_graph_module = types.ModuleType("langraph.app.graph")
    _mock_graph_module.build_graph = MagicMock()  # type: ignore[attr-defined]
    sys.modules["langraph.app.graph"] = _mock_graph_module


def _parse_sse_events(text: str) -> list[dict]:
    """Parse SSE text into a list of event dicts with 'event' and 'data' keys."""
    events = []
    current: dict = {}
    for line in text.split("\n"):
        if line.startswith("event:"):
            current["event"] = line.split(":", 1)[1].strip()
        elif line.startswith("data:"):
            current["data"] = line.split(":", 1)[1].strip()
        elif line.strip() == "" and current:
            events.append(current)
            current = {}
    if current:
        events.append(current)
    return events


def _make_rag_result(*, answer="The answer is 42.", sources=None):
    """Create a RAG graph result dict."""
    if sources is None:
        sources = [
            {
                "document_id": "507f1f77bcf86cd799439011",
                "title": "Contract A",
                "snippet": "Relevant clause about liability.",
            },
        ]
    return {
        "answer": answer,
        "sources": sources,
    }


def _mock_build_rag_graph(result, tokens=None):
    """Create a mock build_rag_graph that emits tokens and returns result.

    The mock graph's ainvoke puts token strings into the queue from state,
    then puts the ("complete", result) sentinel.
    """
    if tokens is None:
        tokens = ["The ", "answer ", "is ", "42."]

    mock_graph = MagicMock()

    async def mock_ainvoke(state):
        queue = state["token_callback"]
        for token in tokens:
            await queue.put(token)
        return result

    mock_graph.ainvoke = mock_ainvoke
    mock_build = MagicMock(return_value=mock_graph)
    return mock_build


@pytest.fixture
def app():
    """Create a test app instance with mocked settings."""
    with patch("api.main.get_settings") as mock_settings:
        mock_settings.return_value.app_title = "Test"
        mock_settings.return_value.cors_origins = ["http://localhost:8080"]
        yield create_app()


@pytest.fixture
def client(app):
    """Create an httpx AsyncClient for the test app."""
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


class TestQueryAssistant:
    """Tests for POST /api/v1/assistant/query."""

    @pytest.mark.asyncio
    async def test_streams_token_events_and_complete(self, client):
        """Test that query streams token events followed by a complete event."""
        rag_result = _make_rag_result()

        with (
            patch(
                "langraph.app.rag_graph.build_rag_graph",
                _mock_build_rag_graph(rag_result),
            ),
            patch(
                "api.routes.v1.endpoints.assistant.logger",
            ) as mock_logger,
        ):
            resp = await client.post(
                "/api/v1/assistant/query",
                json={"query": "What is the liability clause?"},
            )

        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]

        events = _parse_sse_events(resp.text)
        token_events = [e for e in events if e.get("event") == "token"]
        complete_events = [e for e in events if e.get("event") == "complete"]

        assert len(token_events) == 4
        tokens = [json.loads(e["data"])["text"] for e in token_events]
        assert tokens == ["The ", "answer ", "is ", "42."]

        assert len(complete_events) == 1
        complete_data = json.loads(complete_events[0]["data"])
        assert "sources" in complete_data
        mock_logger.info.assert_called_once_with("Assistant query started")

    @pytest.mark.asyncio
    async def test_complete_event_contains_sources_with_correct_keys(self, client):
        """Test that the complete event sources have documentId, title, snippet."""
        sources = [
            {
                "document_id": "aaa111",
                "title": "Doc A",
                "snippet": "Snippet A",
            },
            {
                "document_id": "bbb222",
                "title": "Doc B",
                "snippet": "Snippet B",
            },
        ]
        rag_result = _make_rag_result(sources=sources)

        with patch(
            "langraph.app.rag_graph.build_rag_graph",
            _mock_build_rag_graph(rag_result),
        ):
            resp = await client.post(
                "/api/v1/assistant/query",
                json={"query": "Tell me about these docs."},
            )

        events = _parse_sse_events(resp.text)
        complete_events = [e for e in events if e.get("event") == "complete"]
        complete_data = json.loads(complete_events[0]["data"])

        assert len(complete_data["sources"]) == 2
        assert complete_data["sources"][0] == {
            "documentId": "aaa111",
            "title": "Doc A",
            "snippet": "Snippet A",
        }
        assert complete_data["sources"][1] == {
            "documentId": "bbb222",
            "title": "Doc B",
            "snippet": "Snippet B",
        }

    @pytest.mark.asyncio
    async def test_complete_event_with_empty_sources(self, client):
        """Test that an empty sources list is returned when graph has no sources."""
        rag_result = _make_rag_result(sources=[])

        with patch(
            "langraph.app.rag_graph.build_rag_graph",
            _mock_build_rag_graph(rag_result, tokens=["Done."]),
        ):
            resp = await client.post(
                "/api/v1/assistant/query",
                json={"query": "Anything?"},
            )

        events = _parse_sse_events(resp.text)
        complete_events = [e for e in events if e.get("event") == "complete"]
        complete_data = json.loads(complete_events[0]["data"])

        assert complete_data["sources"] == []

    @pytest.mark.asyncio
    async def test_complete_event_when_sources_key_missing(self, client):
        """Test that missing sources key in result defaults to empty list."""
        rag_result = {"answer": "No sources available."}

        with patch(
            "langraph.app.rag_graph.build_rag_graph",
            _mock_build_rag_graph(rag_result, tokens=["No."]),
        ):
            resp = await client.post(
                "/api/v1/assistant/query",
                json={"query": "Anything?"},
            )

        events = _parse_sse_events(resp.text)
        complete_events = [e for e in events if e.get("event") == "complete"]
        complete_data = json.loads(complete_events[0]["data"])

        assert complete_data["sources"] == []

    @pytest.mark.asyncio
    async def test_passes_query_and_callback_to_graph_state(self, client):
        """Test that query string and token_callback queue are passed to graph."""
        captured_state = {}
        mock_graph = MagicMock()

        async def capturing_ainvoke(state):
            captured_state.update(state)
            return _make_rag_result()

        mock_graph.ainvoke = capturing_ainvoke
        mock_build = MagicMock(return_value=mock_graph)

        with patch(
            "langraph.app.rag_graph.build_rag_graph",
            mock_build,
        ):
            resp = await client.post(
                "/api/v1/assistant/query",
                json={"query": "What is the penalty clause?"},
            )

        assert resp.status_code == 200
        assert captured_state["query"] == "What is the penalty clause?"
        assert hasattr(captured_state["token_callback"], "put")

    @pytest.mark.asyncio
    async def test_returns_error_on_graph_exception(self, client):
        """Test that a graph execution error emits an error SSE event."""
        mock_graph = MagicMock()

        async def failing_ainvoke(state):
            queue = state["token_callback"]
            await queue.put("partial ")
            raise RuntimeError("LLM failure")

        mock_graph.ainvoke = failing_ainvoke
        mock_build = MagicMock(return_value=mock_graph)

        with patch(
            "langraph.app.rag_graph.build_rag_graph",
            mock_build,
        ):
            resp = await client.post(
                "/api/v1/assistant/query",
                json={"query": "This will fail."},
            )

        assert resp.status_code == 200
        events = _parse_sse_events(resp.text)
        token_events = [e for e in events if e.get("event") == "token"]
        assert len(token_events) >= 1

        error_events = [e for e in events if e.get("event") == "error"]
        assert len(error_events) == 1
        error_data = json.loads(error_events[0]["data"])
        assert error_data["code"] == "INTERNAL_ERROR"
        assert "LLM failure" in error_data["message"]

    @pytest.mark.asyncio
    async def test_streams_no_tokens_when_graph_has_none(self, client):
        """Test that zero token events are emitted when graph produces none."""
        rag_result = _make_rag_result()

        with patch(
            "langraph.app.rag_graph.build_rag_graph",
            _mock_build_rag_graph(rag_result, tokens=[]),
        ):
            resp = await client.post(
                "/api/v1/assistant/query",
                json={"query": "Quick answer."},
            )

        events = _parse_sse_events(resp.text)
        token_events = [e for e in events if e.get("event") == "token"]
        complete_events = [e for e in events if e.get("event") == "complete"]

        assert len(token_events) == 0
        assert len(complete_events) == 1
