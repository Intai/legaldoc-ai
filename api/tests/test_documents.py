"""Tests for the documents API endpoints."""

import base64
import json
import sys
import types
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from beanie import PydanticObjectId
from httpx import ASGITransport, AsyncClient

from api.main import create_app
from api.models.document import DocumentModel, DocumentStatus, DocumentType
from api.models.reference import ReferenceModel

# Pre-seed sys.modules with a mock langraph.app.graph to prevent importing
# the real module (which requires an Anthropic API key).
if "langraph" not in sys.modules:
    sys.modules["langraph"] = types.ModuleType("langraph")
if "langraph.app" not in sys.modules:
    sys.modules["langraph.app"] = types.ModuleType("langraph.app")
_mock_graph_module = types.ModuleType("langraph.app.graph")
_mock_graph_module.build_graph = MagicMock()  # type: ignore[attr-defined]
sys.modules["langraph.app.graph"] = _mock_graph_module


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


class TestBuildPdf:
    """Tests for the build_pdf general helper function."""

    def test_returns_valid_pdf_bytes_and_page_count(self):
        """Test that build_pdf returns PDF bytes starting with %PDF."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {
                "heading": "Section One",
                "content": [
                    {"type": "paragraph", "text": "Hello world."},
                ],
            },
        ]
        pdf_bytes, page_count = build_pdf("Test Title", sections)

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_paragraph_block(self):
        """Test that a paragraph block produces valid PDF output."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {
                "heading": "Heading",
                "content": [{"type": "paragraph", "text": "Body text."}],
            },
        ]
        pdf_bytes, page_count = build_pdf("Title", sections)

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_bold_block(self):
        """Test that a bold block produces valid PDF output."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {
                "heading": "Heading",
                "content": [{"type": "bold", "text": "Bold text."}],
            },
        ]
        pdf_bytes, page_count = build_pdf("Title", sections)

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_italic_block(self):
        """Test that an italic block produces valid PDF output."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {
                "heading": "Heading",
                "content": [{"type": "italic", "text": "Italic text."}],
            },
        ]
        pdf_bytes, page_count = build_pdf("Title", sections)

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_list_block(self):
        """Test that a list block produces valid PDF output with bullet items."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {
                "heading": "Heading",
                "content": [
                    {"type": "list", "items": ["Item one", "Item two", "Item three"]},
                ],
            },
        ]
        pdf_bytes, page_count = build_pdf("Title", sections)

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_list_block_with_empty_items(self):
        """Test that a list block with no items does not add a ListFlowable."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {
                "heading": "Heading",
                "content": [{"type": "list", "items": []}],
            },
        ]
        pdf_bytes, page_count = build_pdf("Title", sections)

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_mixed_content_blocks(self):
        """Test that multiple block types in one section produce valid output."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {
                "heading": "Mixed Section",
                "content": [
                    {"type": "paragraph", "text": "Normal text."},
                    {"type": "bold", "text": "Bold text."},
                    {"type": "italic", "text": "Italic text."},
                    {"type": "list", "items": ["A", "B"]},
                ],
            },
        ]
        pdf_bytes, page_count = build_pdf("Title", sections)

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_multiple_sections(self):
        """Test that multiple sections each get their own heading."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {
                "heading": "First",
                "content": [{"type": "paragraph", "text": "Body 1."}],
            },
            {
                "heading": "Second",
                "content": [{"type": "paragraph", "text": "Body 2."}],
            },
        ]
        pdf_bytes, page_count = build_pdf("Title", sections)

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_empty_sections(self):
        """Test that an empty sections list produces a valid PDF with just the title."""
        from api.routes.v1.endpoints.documents import build_pdf

        pdf_bytes, page_count = build_pdf("Title Only", [])

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_section_without_heading(self):
        """Test that a section with an empty heading skips the heading flowable."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {
                "heading": "",
                "content": [{"type": "paragraph", "text": "No heading."}],
            },
        ]
        pdf_bytes, page_count = build_pdf("Title", sections)

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_section_with_empty_content(self):
        """Test that a section with no content blocks still renders heading."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {"heading": "Empty Content", "content": []},
        ]
        pdf_bytes, page_count = build_pdf("Title", sections)

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_unknown_block_type_is_ignored(self):
        """Test that an unrecognised block type is silently skipped."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {
                "heading": "Heading",
                "content": [{"type": "unknown", "text": "Ignored."}],
            },
        ]
        pdf_bytes, page_count = build_pdf("Title", sections)

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1

    def test_block_missing_text_key(self):
        """Test that a paragraph block without text key uses empty string."""
        from api.routes.v1.endpoints.documents import build_pdf

        sections = [
            {
                "heading": "Heading",
                "content": [{"type": "paragraph"}],
            },
        ]
        pdf_bytes, page_count = build_pdf("Title", sections)

        assert pdf_bytes.startswith(b"%PDF")
        assert page_count >= 1




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
    async def test_cursor_pagination_alpha(self, client):
        """Test that sort=alpha cursor encodes title instead of created_at."""
        id1 = "507f1f77bcf86cd799439011"
        id2 = "507f1f77bcf86cd799439012"
        id3 = "507f1f77bcf86cd799439013"
        doc1 = _make_doc(title="Alpha", doc_id=id1)
        doc2 = _make_doc(title="Beta", doc_id=id2)
        extra = _make_doc(title="Gamma", doc_id=id3)

        mock_find, _, _ = _mock_find([doc1, doc2, extra])

        with patch.object(DocumentModel, "find", return_value=mock_find):
            resp = await client.get("/api/v1/documents?sort=alpha&limit=2")

        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]["documents"]) == 2
        cursor_data = json.loads(
            base64.urlsafe_b64decode(body["data"]["nextCursor"]).decode()
        )
        assert cursor_data["_id"] == id2
        assert cursor_data["title"] == "Beta"
        assert "created_at" not in cursor_data

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


def _make_raw_doc(
    *,
    doc_id="507f1f77bcf86cd799439011",
    title="Test Doc",
    doc_type=DocumentType.CONTRACT,
    status=DocumentStatus.DONE,
    description="A test document.",
    page_count=3,
    created_at=None,
):
    """Create a raw MongoDB dict matching DocumentModel shape."""
    return {
        "_id": PydanticObjectId(doc_id),
        "title": title,
        "type": doc_type,
        "status": status,
        "description": description,
        "created_at": created_at
        or datetime(2025, 1, 15, 10, 0, 0, tzinfo=timezone.utc),
        "page_count": page_count,
        "pdf_content": None,
    }


class TestUpdateDocumentStatus:
    """Tests for PUT /api/v1/documents/{id}/status."""

    @pytest.mark.asyncio
    async def test_updates_document_status(self, client):
        """Test that a valid request updates the status and returns the document."""
        raw = _make_raw_doc(status=DocumentStatus.DONE)
        mock_collection = MagicMock()
        mock_collection.find_one_and_update = AsyncMock(return_value=raw)

        with patch.object(
            DocumentModel, "get_motor_collection", return_value=mock_collection
        ):
            resp = await client.put(
                "/api/v1/documents/507f1f77bcf86cd799439011/status",
                json={"status": "Done"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["error"] is None
        assert body["data"]["status"] == "Done"
        mock_collection.find_one_and_update.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_returns_404_when_not_found(self, client):
        """Test that updating a missing document returns a NOT_FOUND error."""
        mock_collection = MagicMock()
        mock_collection.find_one_and_update = AsyncMock(return_value=None)

        with patch.object(
            DocumentModel, "get_motor_collection", return_value=mock_collection
        ):
            resp = await client.put(
                "/api/v1/documents/507f1f77bcf86cd799439011/status",
                json={"status": "Done"},
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "NOT_FOUND"
        assert body["error"]["message"] == "Document not found."

    @pytest.mark.asyncio
    async def test_returns_error_for_invalid_id(self, client):
        """Test that an invalid ObjectId returns an INVALID_ID error."""
        resp = await client.put(
            "/api/v1/documents/not-valid-id/status",
            json={"status": "Done"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "INVALID_ID"

    @pytest.mark.asyncio
    async def test_returns_422_for_invalid_status(self, client):
        """Test that an invalid status value returns a 422 validation error."""
        resp = await client.put(
            "/api/v1/documents/507f1f77bcf86cd799439011/status",
            json={"status": "InvalidStatus"},
        )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_returns_error_on_db_failure(self, client):
        """Test that a database error returns an INTERNAL_ERROR."""
        mock_collection = MagicMock()
        mock_collection.find_one_and_update = AsyncMock(
            side_effect=RuntimeError("db failure")
        )

        with patch.object(
            DocumentModel, "get_motor_collection", return_value=mock_collection
        ):
            resp = await client.put(
                "/api/v1/documents/507f1f77bcf86cd799439011/status",
                json={"status": "Done"},
            )

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


def _make_ref(
    *,
    title="NDA Template",
    ref_type=DocumentType.NDA,
    description="A reference.",
    pdf_content=b"fake-pdf-bytes",
    ref_id="607f1f77bcf86cd799439011",
):
    """Create a mock ReferenceModel instance."""
    ref = MagicMock(spec=ReferenceModel)
    ref.id = ref_id
    ref.title = title
    ref.type = ref_type
    ref.description = description
    ref.pdf_content = pdf_content
    ref.created_at = datetime(2025, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    return ref


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


def _make_graph_result(
    *,
    title="NDA Template",
    doc_type="NDA",
    description="Generated description",
    sections=None,
):
    """Create a graph result dict matching GenerateDocumentState output."""
    if sections is None:
        sections = [
            {
                "heading": "Section 1",
                "content": [{"type": "paragraph", "text": "Body text."}],
            },
        ]
    return {
        "title": title,
        "doc_type": doc_type,
        "description": description,
        "sections": sections,
    }


def _mock_build_graph(result, phases=None):
    """Create a mock build_graph that emits phases and returns result.

    The mock graph's ainvoke puts phase strings into the queue from state,
    then puts the ("complete", result) sentinel.
    """
    if phases is None:
        phases = ["analyzing", "structuring", "drafting", "finalizing"]

    mock_graph = MagicMock()

    async def mock_ainvoke(state):
        queue = state["phase_callback"]
        for phase in phases:
            await queue.put(phase)
        return result

    mock_graph.ainvoke = mock_ainvoke
    mock_build = MagicMock(return_value=mock_graph)
    return mock_build


class TestParseSseEvents:
    """Tests for _parse_sse_events helper."""

    def test_parses_event_without_trailing_blank_line(self):
        text = "event: phase\ndata: test"
        events = _parse_sse_events(text)
        assert events == [{"event": "phase", "data": "test"}]


class TestGenerateDocument:
    """Tests for POST /api/v1/documents/generate."""

    @pytest.mark.asyncio
    async def test_streams_phase_events_and_complete(self, client):
        """Test that generation streams phase events followed by a complete event."""
        ref = _make_ref()
        mock_doc = MagicMock(spec=DocumentModel)
        mock_doc.id = "507f1f77bcf86cd799439011"
        graph_result = _make_graph_result()

        with (
            patch.object(
                ReferenceModel,
                "get",
                new_callable=AsyncMock,
                return_value=ref,
            ),
            patch(
                "api.routes.v1.endpoints.documents.DocumentModel",
            ) as MockDocCls,
            patch(
                "langraph.app.graph.build_graph",
                _mock_build_graph(graph_result),
            ),
            patch(
                "api.routes.v1.endpoints.documents.build_pdf",
                return_value=(b"%PDF-fake", 2),
            ),
        ):
            MockDocCls.return_value = mock_doc
            MockDocCls.return_value.insert = AsyncMock(return_value=None)

            resp = await client.post(
                "/api/v1/documents/generate",
                json={
                    "referenceIds": ["607f1f77bcf86cd799439011"],
                    "context": "Generate an NDA for two parties.",
                },
            )

        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]

        events = _parse_sse_events(resp.text)
        phase_events = [e for e in events if e.get("event") == "phase"]
        complete_events = [e for e in events if e.get("event") == "complete"]

        assert len(phase_events) == 4
        phases = [json.loads(e["data"])["phase"] for e in phase_events]
        assert phases == ["analyzing", "structuring", "drafting", "finalizing"]

        assert len(complete_events) == 1
        complete_data = json.loads(complete_events[0]["data"])
        assert "documentId" in complete_data

    @pytest.mark.asyncio
    async def test_creates_document_from_graph_result(self, client):
        """Test that document is created with title and type from graph result."""
        ref = _make_ref()
        created_doc = MagicMock(spec=DocumentModel)
        created_doc.id = "507f1f77bcf86cd799439011"
        graph_result = _make_graph_result(
            title="Generated Title",
            doc_type="Contract",
            description="Generated desc",
        )

        with (
            patch.object(
                ReferenceModel,
                "get",
                new_callable=AsyncMock,
                return_value=ref,
            ),
            patch(
                "api.routes.v1.endpoints.documents.DocumentModel",
            ) as MockDocCls,
            patch(
                "langraph.app.graph.build_graph",
                _mock_build_graph(graph_result),
            ),
            patch(
                "api.routes.v1.endpoints.documents.build_pdf",
                return_value=(b"%PDF-fake", 3),
            ),
        ):
            call_args = {}

            def capture_init(**kwargs):
                call_args.update(kwargs)
                return created_doc

            MockDocCls.side_effect = capture_init
            created_doc.insert = AsyncMock(return_value=None)

            resp = await client.post(
                "/api/v1/documents/generate",
                json={
                    "referenceIds": ["607f1f77bcf86cd799439011"],
                    "context": "Some context.",
                },
            )

        assert resp.status_code == 200
        assert call_args["title"] == "Generated Title"
        assert call_args["type"] == "Contract"
        assert call_args["status"] == DocumentStatus.DRAFT
        assert call_args["description"] == "Generated desc"
        assert call_args["page_count"] == 3
        assert call_args["pdf_content"] == b"%PDF-fake"

    @pytest.mark.asyncio
    async def test_uses_context_fallback_when_no_description(self, client):
        """Test that description falls back to truncated context when missing."""
        ref = _make_ref()
        created_doc = MagicMock(spec=DocumentModel)
        created_doc.id = "507f1f77bcf86cd799439011"
        long_context = "B" * 300

        # Graph result without description key
        graph_result = {
            "title": "Title",
            "doc_type": "NDA",
            "sections": [
                {
                    "heading": "S1",
                    "content": [{"type": "paragraph", "text": "Text."}],
                },
            ],
        }

        with (
            patch.object(
                ReferenceModel,
                "get",
                new_callable=AsyncMock,
                return_value=ref,
            ),
            patch(
                "api.routes.v1.endpoints.documents.DocumentModel",
            ) as MockDocCls,
            patch(
                "langraph.app.graph.build_graph",
                _mock_build_graph(graph_result),
            ),
            patch(
                "api.routes.v1.endpoints.documents.build_pdf",
                return_value=(b"%PDF-fake", 1),
            ),
        ):
            call_args = {}

            def capture_init(**kwargs):
                call_args.update(kwargs)
                return created_doc

            MockDocCls.side_effect = capture_init
            created_doc.insert = AsyncMock(return_value=None)

            resp = await client.post(
                "/api/v1/documents/generate",
                json={
                    "referenceIds": ["607f1f77bcf86cd799439011"],
                    "context": long_context,
                },
            )

        assert resp.status_code == 200
        assert len(call_args["description"]) == 200

    @pytest.mark.asyncio
    async def test_returns_error_when_no_valid_references(self, client):
        """Test that an error event is emitted when no references are found."""
        with patch.object(
            ReferenceModel,
            "get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = await client.post(
                "/api/v1/documents/generate",
                json={
                    "referenceIds": ["607f1f77bcf86cd799439011"],
                    "context": "Some context",
                },
            )

        assert resp.status_code == 200
        events = _parse_sse_events(resp.text)
        error_events = [e for e in events if e.get("event") == "error"]
        assert len(error_events) == 1
        error_data = json.loads(error_events[0]["data"])
        assert error_data["code"] == "NOT_FOUND"

    @pytest.mark.asyncio
    async def test_returns_error_on_reference_lookup_exception(self, client):
        """Test that an exception during reference lookup emits an error event."""
        with patch.object(
            ReferenceModel,
            "get",
            new_callable=AsyncMock,
            side_effect=RuntimeError("db failure"),
        ):
            resp = await client.post(
                "/api/v1/documents/generate",
                json={
                    "referenceIds": ["607f1f77bcf86cd799439011"],
                    "context": "Some context",
                },
            )

        assert resp.status_code == 200
        events = _parse_sse_events(resp.text)
        error_events = [e for e in events if e.get("event") == "error"]
        assert len(error_events) == 1
        error_data = json.loads(error_events[0]["data"])
        assert error_data["code"] == "INTERNAL_ERROR"

    @pytest.mark.asyncio
    async def test_returns_error_on_graph_exception(self, client):
        """Test that a graph execution error emits an error event."""
        ref = _make_ref()

        mock_graph = MagicMock()

        async def failing_ainvoke(state):
            queue = state["phase_callback"]
            await queue.put("analyzing")
            raise RuntimeError("LLM failure")

        mock_graph.ainvoke = failing_ainvoke
        mock_build = MagicMock(return_value=mock_graph)

        with (
            patch.object(
                ReferenceModel,
                "get",
                new_callable=AsyncMock,
                return_value=ref,
            ),
            patch(
                "langraph.app.graph.build_graph",
                mock_build,
            ),
        ):
            resp = await client.post(
                "/api/v1/documents/generate",
                json={
                    "referenceIds": ["607f1f77bcf86cd799439011"],
                    "context": "Some context",
                },
            )

        assert resp.status_code == 200
        events = _parse_sse_events(resp.text)
        # Should have at least the analyzing phase before the error
        phase_events = [e for e in events if e.get("event") == "phase"]
        assert len(phase_events) >= 1
        error_events = [e for e in events if e.get("event") == "error"]
        assert len(error_events) == 1
        error_data = json.loads(error_events[0]["data"])
        assert error_data["code"] == "INTERNAL_ERROR"

    @pytest.mark.asyncio
    async def test_passes_pdf_content_to_graph_state(self, client):
        """Test that reference pdf_content bytes are passed to graph state."""
        ref = _make_ref(pdf_content=b"real-pdf-bytes")
        mock_doc = MagicMock(spec=DocumentModel)
        mock_doc.id = "507f1f77bcf86cd799439011"

        captured_state = {}
        mock_graph = MagicMock()

        async def capturing_ainvoke(state):
            captured_state.update(state)
            queue = state["phase_callback"]
            await queue.put("analyzing")
            return _make_graph_result()

        mock_graph.ainvoke = capturing_ainvoke
        mock_build = MagicMock(return_value=mock_graph)

        with (
            patch.object(
                ReferenceModel,
                "get",
                new_callable=AsyncMock,
                return_value=ref,
            ),
            patch(
                "api.routes.v1.endpoints.documents.DocumentModel",
            ) as MockDocCls,
            patch(
                "langraph.app.graph.build_graph",
                mock_build,
            ),
            patch(
                "api.routes.v1.endpoints.documents.build_pdf",
                return_value=(b"%PDF-fake", 1),
            ),
        ):
            MockDocCls.return_value = mock_doc
            MockDocCls.return_value.insert = AsyncMock(return_value=None)

            resp = await client.post(
                "/api/v1/documents/generate",
                json={
                    "referenceIds": ["607f1f77bcf86cd799439011"],
                    "context": "Test context",
                },
            )

        assert resp.status_code == 200
        assert captured_state["references"] == [b"real-pdf-bytes"]
        assert captured_state["context"] == "Test context"

    @pytest.mark.asyncio
    async def test_skips_references_without_pdf_content(self, client):
        """Test that references with no pdf_content are excluded from state."""
        ref = _make_ref(pdf_content=None)
        mock_doc = MagicMock(spec=DocumentModel)
        mock_doc.id = "507f1f77bcf86cd799439011"

        captured_state = {}
        mock_graph = MagicMock()

        async def capturing_ainvoke(state):
            captured_state.update(state)
            return _make_graph_result()

        mock_graph.ainvoke = capturing_ainvoke
        mock_build = MagicMock(return_value=mock_graph)

        with (
            patch.object(
                ReferenceModel,
                "get",
                new_callable=AsyncMock,
                return_value=ref,
            ),
            patch(
                "api.routes.v1.endpoints.documents.DocumentModel",
            ) as MockDocCls,
            patch(
                "langraph.app.graph.build_graph",
                mock_build,
            ),
            patch(
                "api.routes.v1.endpoints.documents.build_pdf",
                return_value=(b"%PDF-fake", 1),
            ),
        ):
            MockDocCls.return_value = mock_doc
            MockDocCls.return_value.insert = AsyncMock(return_value=None)

            resp = await client.post(
                "/api/v1/documents/generate",
                json={
                    "referenceIds": ["607f1f77bcf86cd799439011"],
                    "context": "Test context",
                },
            )

        assert resp.status_code == 200
        assert captured_state["references"] == []

    @pytest.mark.asyncio
    async def test_calls_build_pdf_with_graph_result(self, client):
        """Test that build_pdf is called with title and sections from graph."""
        ref = _make_ref()
        mock_doc = MagicMock(spec=DocumentModel)
        mock_doc.id = "507f1f77bcf86cd799439011"
        sections = [
            {
                "heading": "Custom Section",
                "content": [{"type": "paragraph", "text": "Custom text."}],
            },
        ]
        graph_result = _make_graph_result(
            title="Custom Title", sections=sections
        )

        with (
            patch.object(
                ReferenceModel,
                "get",
                new_callable=AsyncMock,
                return_value=ref,
            ),
            patch(
                "api.routes.v1.endpoints.documents.DocumentModel",
            ) as MockDocCls,
            patch(
                "langraph.app.graph.build_graph",
                _mock_build_graph(graph_result),
            ),
            patch(
                "api.routes.v1.endpoints.documents.build_pdf",
                return_value=(b"%PDF-fake", 1),
            ) as mock_build_pdf,
        ):
            MockDocCls.return_value = mock_doc
            MockDocCls.return_value.insert = AsyncMock(return_value=None)

            resp = await client.post(
                "/api/v1/documents/generate",
                json={
                    "referenceIds": ["607f1f77bcf86cd799439011"],
                    "context": "Test context",
                },
            )

        assert resp.status_code == 200
        mock_build_pdf.assert_called_once_with("Custom Title", sections)
