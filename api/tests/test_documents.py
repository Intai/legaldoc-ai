"""Tests for the documents API endpoints."""

import base64
import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from beanie import PydanticObjectId
from httpx import ASGITransport, AsyncClient

from api.main import create_app
from api.models.document import DocumentModel, DocumentStatus, DocumentType


def _make_cursor(payload: dict) -> str:
    """Encode a cursor payload dict to a base64 string."""
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


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
        ts = datetime(2025, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
        id1 = "507f1f77bcf86cd799439011"
        id2 = "507f1f77bcf86cd799439012"
        id3 = "507f1f77bcf86cd799439013"
        doc1 = _make_doc(title="Doc 1", doc_id=id1, created_at=ts)
        doc2 = _make_doc(title="Doc 2", doc_id=id2, created_at=ts)
        extra = _make_doc(title="Doc 3", doc_id=id3, created_at=ts)

        mock_find, _, _ = _mock_find([doc1, doc2, extra])

        with patch.object(DocumentModel, "find", return_value=mock_find):
            resp = await client.get("/api/v1/documents?limit=2")

        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]["documents"]) == 2
        cursor_data = json.loads(
            base64.urlsafe_b64decode(body["data"]["nextCursor"]).decode()
        )
        assert cursor_data["_id"] == "507f1f77bcf86cd799439012"
        assert "created_at" in cursor_data

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
    async def test_cursor_filters_recent(self, client):
        """Test that a recent-sort cursor adds a $or filter with created_at and _id."""
        mock_find, _, _ = _mock_find([])
        cursor_val = _make_cursor({
            "created_at": "2025-01-15T10:00:00+00:00",
            "_id": "507f1f77bcf86cd799439011",
        })

        with patch.object(DocumentModel, "find", return_value=mock_find) as find_call:
            resp = await client.get(f"/api/v1/documents?cursor={cursor_val}")

        assert resp.status_code == 200
        call_args = find_call.call_args[0][0]
        cursor_date = datetime.fromisoformat("2025-01-15T10:00:00+00:00")
        cursor_id = PydanticObjectId("507f1f77bcf86cd799439011")
        assert call_args["$or"] == [
            {"created_at": {"$lt": cursor_date}},
            {"created_at": cursor_date, "_id": {"$lt": cursor_id}},
        ]

    @pytest.mark.asyncio
    async def test_cursor_filters_alpha(self, client):
        """Test that an alpha-sort cursor adds a $or filter with title and _id."""
        mock_find, _, _ = _mock_find([])
        cursor_val = _make_cursor({
            "title": "Doc A",
            "_id": "507f1f77bcf86cd799439011",
        })

        with patch.object(DocumentModel, "find", return_value=mock_find) as find_call:
            resp = await client.get(
                f"/api/v1/documents?sort=alpha&cursor={cursor_val}"
            )

        assert resp.status_code == 200
        call_args = find_call.call_args[0][0]
        cursor_id = PydanticObjectId("507f1f77bcf86cd799439011")
        assert call_args["$or"] == [
            {"title": {"$gt": "Doc A"}},
            {"title": "Doc A", "_id": {"$gt": cursor_id}},
        ]

    @pytest.mark.asyncio
    async def test_invalid_cursor(self, client):
        """Test that an invalid cursor returns an error response."""
        resp = await client.get("/api/v1/documents?cursor=not-a-valid-cursor")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "INVALID_CURSOR"

    @pytest.mark.asyncio
    async def test_malformed_cursor_payload(self, client):
        """Test that a base64 cursor with invalid payload returns an error."""
        bad_cursor = _make_cursor({"bad": "data"})
        resp = await client.get(f"/api/v1/documents?cursor={bad_cursor}")

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


class TestGetDocument:
    """Tests for GET /api/v1/documents/{id}."""

    @pytest.mark.asyncio
    async def test_returns_document_detail(self, client):
        """Test that a valid ID returns document metadata in the envelope."""
        doc = _make_doc()

        with patch.object(
            DocumentModel, "get", new_callable=AsyncMock, return_value=doc
        ):
            resp = await client.get("/api/v1/documents/507f1f77bcf86cd799439011")

        assert resp.status_code == 200
        body = resp.json()
        assert body["error"] is None
        assert body["data"]["id"] == "507f1f77bcf86cd799439011"
        assert body["data"]["title"] == "Test Doc"
        assert body["data"]["type"] == "Contract"
        assert body["data"]["status"] == "Done"
        assert body["data"]["description"] == "A test document."
        assert body["data"]["createdAt"] is not None
        assert body["data"]["pageCount"] == 3

    @pytest.mark.asyncio
    async def test_returns_404_when_not_found(self, client):
        """Test that a missing document returns a NOT_FOUND error."""
        with patch.object(
            DocumentModel,
            "get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = await client.get("/api/v1/documents/507f1f77bcf86cd799439011")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "NOT_FOUND"
        assert body["error"]["message"] == "Document not found."

    @pytest.mark.asyncio
    async def test_returns_error_for_invalid_id(self, client):
        """Test that an invalid ObjectId returns an INVALID_ID error."""
        resp = await client.get("/api/v1/documents/not-valid-id")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "INVALID_ID"

    @pytest.mark.asyncio
    async def test_returns_error_on_db_failure(self, client):
        """Test that a database error returns an INTERNAL_ERROR."""
        with patch.object(
            DocumentModel,
            "get",
            new_callable=AsyncMock,
            side_effect=RuntimeError("db failure"),
        ):
            resp = await client.get("/api/v1/documents/507f1f77bcf86cd799439011")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "INTERNAL_ERROR"


class TestGetDocumentPdf:
    """Tests for GET /api/v1/documents/{id}/pdf."""

    @pytest.mark.asyncio
    async def test_returns_pdf_content(self, client):
        """Test that a valid document with pdf_content returns the PDF binary."""
        pdf_bytes = b"%PDF-1.4 fake content"
        doc = _make_doc(title="My Contract")
        doc.pdf_content = pdf_bytes

        with patch.object(
            DocumentModel, "get", new_callable=AsyncMock, return_value=doc
        ):
            resp = await client.get("/api/v1/documents/507f1f77bcf86cd799439011/pdf")

        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert (
            resp.headers["content-disposition"]
            == 'attachment; filename="My Contract.pdf"'
        )
        assert resp.content == pdf_bytes

    @pytest.mark.asyncio
    async def test_returns_404_when_document_not_found(self, client):
        """Test that a missing document returns a 404 error envelope."""
        with patch.object(
            DocumentModel,
            "get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = await client.get("/api/v1/documents/507f1f77bcf86cd799439011/pdf")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "NOT_FOUND"
        assert body["error"]["message"] == "Document not found."

    @pytest.mark.asyncio
    async def test_returns_404_when_no_pdf_content(self, client):
        """Test that a document without pdf_content returns a 404 error envelope."""
        doc = _make_doc()
        doc.pdf_content = None

        with patch.object(
            DocumentModel, "get", new_callable=AsyncMock, return_value=doc
        ):
            resp = await client.get("/api/v1/documents/507f1f77bcf86cd799439011/pdf")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "NOT_FOUND"
        assert body["error"]["message"] == "Document has no PDF content."

    @pytest.mark.asyncio
    async def test_returns_error_for_invalid_id(self, client):
        """Test that an invalid ObjectId returns an error envelope."""
        resp = await client.get("/api/v1/documents/not-valid-id/pdf")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "INVALID_ID"
