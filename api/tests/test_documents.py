"""Tests for the documents list API endpoint."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import create_app
from api.models.document import DocumentModel, DocumentStatus, DocumentType


def _make_doc(
    *,
    title="Test Doc",
    doc_type=DocumentType.CONTRACT,
    status=DocumentStatus.DONE,
    description="A test document.",
    page_count=3,
    created_at=None,
    doc_id="507f1f77bcf86cd799439011",
):
    """Create a mock DocumentModel instance."""
    doc = MagicMock(spec=DocumentModel)
    doc.id = doc_id
    doc.title = title
    doc.type = doc_type
    doc.status = status
    doc.description = description
    doc.created_at = created_at or datetime(2025, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    doc.page_count = page_count
    return doc


def _mock_find(docs):
    """Build a chainable mock for DocumentModel.find().sort().limit().to_list()."""
    mock_to_list = AsyncMock(return_value=docs)
    mock_limit = MagicMock()
    mock_limit.to_list = mock_to_list
    mock_sort = MagicMock()
    mock_sort.limit.return_value = mock_limit
    mock_find = MagicMock()
    mock_find.sort.return_value = mock_sort
    return mock_find, mock_sort, mock_limit


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


class TestListDocuments:
    """Tests for GET /api/v1/documents."""

    @pytest.mark.asyncio
    async def test_returns_correct_format(self, client):
        """Test that the response has the expected top-level shape."""
        docs = [_make_doc()]
        mock_find, _, _ = _mock_find(docs)

        with patch.object(DocumentModel, "find", return_value=mock_find):
            resp = await client.get("/api/v1/documents")

        assert resp.status_code == 200
        body = resp.json()
        assert "data" in body
        assert "error" in body
        assert body["error"] is None
        assert "documents" in body["data"]
        assert "nextCursor" in body["data"]

        doc = body["data"]["documents"][0]
        assert "id" in doc
        assert "title" in doc
        assert "type" in doc
        assert "status" in doc
        assert "description" in doc
        assert "createdAt" in doc
        assert "pageCount" in doc

    @pytest.mark.asyncio
    async def test_sort_recent(self, client):
        """Test that sort=recent passes -created_at to the query."""
        mock_find, mock_sort, _ = _mock_find([])

        with patch.object(DocumentModel, "find", return_value=mock_find):
            resp = await client.get("/api/v1/documents?sort=recent")

        assert resp.status_code == 200
        mock_find.sort.assert_called_once_with("-created_at")

    @pytest.mark.asyncio
    async def test_sort_alpha(self, client):
        """Test that sort=alpha passes +title to the query."""
        mock_find, mock_sort, _ = _mock_find([])

        with patch.object(DocumentModel, "find", return_value=mock_find):
            resp = await client.get("/api/v1/documents?sort=alpha")

        assert resp.status_code == 200
        mock_find.sort.assert_called_once_with("+title")

    @pytest.mark.asyncio
    async def test_filter_by_type(self, client):
        """Test that the type query parameter filters documents."""
        mock_find, _, _ = _mock_find([])

        with patch.object(DocumentModel, "find", return_value=mock_find) as find_call:
            resp = await client.get("/api/v1/documents?type=NDA")

        assert resp.status_code == 200
        call_args = find_call.call_args[0][0]
        assert call_args["type"] == "NDA"

    @pytest.mark.asyncio
    async def test_cursor_pagination(self, client):
        """Test cursor-based pagination returns next_cursor when more pages exist."""
        doc1 = _make_doc(title="Doc 1", doc_id="507f1f77bcf86cd799439011")
        doc2 = _make_doc(title="Doc 2", doc_id="507f1f77bcf86cd799439012")
        extra = _make_doc(title="Doc 3", doc_id="507f1f77bcf86cd799439013")

        mock_find, _, _ = _mock_find([doc1, doc2, extra])

        with patch.object(DocumentModel, "find", return_value=mock_find):
            resp = await client.get("/api/v1/documents?limit=2")

        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]["documents"]) == 2
        assert body["data"]["nextCursor"] == "507f1f77bcf86cd799439012"

    @pytest.mark.asyncio
    async def test_cursor_pagination_last_page(self, client):
        """Test that next_cursor is null on the last page."""
        doc1 = _make_doc(title="Doc 1", doc_id="507f1f77bcf86cd799439011")

        mock_find, _, _ = _mock_find([doc1])

        with patch.object(DocumentModel, "find", return_value=mock_find):
            resp = await client.get("/api/v1/documents?limit=6")

        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]["documents"]) == 1
        assert body["data"]["nextCursor"] is None

    @pytest.mark.asyncio
    async def test_cursor_filters_by_id(self, client):
        """Test that providing a cursor adds an _id filter to the query."""
        mock_find, _, _ = _mock_find([])
        cursor_val = "507f1f77bcf86cd799439011"

        with patch.object(DocumentModel, "find", return_value=mock_find) as find_call:
            resp = await client.get(f"/api/v1/documents?cursor={cursor_val}")

        assert resp.status_code == 200
        call_args = find_call.call_args[0][0]
        assert "_id" in call_args

    @pytest.mark.asyncio
    async def test_invalid_cursor(self, client):
        """Test that an invalid cursor returns an error response."""
        resp = await client.get("/api/v1/documents?cursor=not-a-valid-id")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "INVALID_CURSOR"

    @pytest.mark.asyncio
    async def test_empty_results(self, client):
        """Test that an empty collection returns an empty list."""
        mock_find, _, _ = _mock_find([])

        with patch.object(DocumentModel, "find", return_value=mock_find):
            resp = await client.get("/api/v1/documents")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["documents"] == []
        assert body["data"]["nextCursor"] is None

    @pytest.mark.asyncio
    async def test_internal_error(self, client):
        """Test that a database error returns an error response."""
        with patch.object(
            DocumentModel, "find", side_effect=RuntimeError("db failure")
        ):
            resp = await client.get("/api/v1/documents")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "INTERNAL_ERROR"
