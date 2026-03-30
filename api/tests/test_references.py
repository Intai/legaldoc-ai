"""Tests for the references API endpoints."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import create_app
from api.models.document import DocumentType
from api.models.reference import ReferenceModel
from api.routes.v1.endpoints.references import _extract_text_from_pdf


def _make_ref(
    *,
    title="Test Reference",
    ref_type=DocumentType.CONTRACT,
    description="A test reference.",
    created_at=None,
    ref_id="507f1f77bcf86cd799439011",
):
    """Create a mock ReferenceModel instance."""
    ref = MagicMock(spec=ReferenceModel)
    ref.id = ref_id
    ref.title = title
    ref.type = ref_type
    ref.description = description
    ref.created_at = created_at or datetime(2025, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    return ref


def _mock_find(refs):
    """Build a chainable mock for ReferenceModel.find().sort().to_list()."""
    mock_to_list = AsyncMock(return_value=refs)
    mock_sort = MagicMock()
    mock_sort.to_list = mock_to_list
    mock_find = MagicMock()
    mock_find.sort.return_value = mock_sort
    return mock_find, mock_sort


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


class TestListReferences:
    """Tests for GET /api/v1/references."""

    @pytest.mark.asyncio
    async def test_returns_all_references_sorted_by_created_at_desc(self, client):
        """Test that references are returned in the correct format and order."""
        ref1 = _make_ref(
            title="Ref 1",
            ref_id="507f1f77bcf86cd799439011",
            created_at=datetime(2025, 1, 16, 10, 0, 0, tzinfo=timezone.utc),
        )
        ref2 = _make_ref(
            title="Ref 2",
            ref_id="507f1f77bcf86cd799439012",
            created_at=datetime(2025, 1, 15, 10, 0, 0, tzinfo=timezone.utc),
        )
        mock_find, mock_sort = _mock_find([ref1, ref2])

        with patch.object(ReferenceModel, "find", return_value=mock_find):
            resp = await client.get("/api/v1/references")

        assert resp.status_code == 200
        body = resp.json()
        assert body["error"] is None
        assert len(body["data"]["references"]) == 2

        mock_find.sort.assert_called_once_with("-created_at")

        first = body["data"]["references"][0]
        assert first["id"] == "507f1f77bcf86cd799439011"
        assert first["title"] == "Ref 1"
        assert first["type"] == "Contract"
        assert first["description"] == "A test reference."
        assert "createdAt" in first

    @pytest.mark.asyncio
    async def test_filters_by_document_type(self, client):
        """Test that the type query parameter filters references."""
        mock_find, _ = _mock_find([])

        with patch.object(ReferenceModel, "find", return_value=mock_find) as find_call:
            resp = await client.get("/api/v1/references?type=NDA")

        assert resp.status_code == 200
        call_args = find_call.call_args[0][0]
        assert call_args["type"] == "NDA"

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_references(self, client):
        """Test that an empty collection returns an empty list."""
        mock_find, _ = _mock_find([])

        with patch.object(ReferenceModel, "find", return_value=mock_find):
            resp = await client.get("/api/v1/references")

        assert resp.status_code == 200
        body = resp.json()
        assert body["error"] is None
        assert body["data"]["references"] == []

    @pytest.mark.asyncio
    async def test_returns_error_on_db_failure(self, client):
        """Test that a database error returns an INTERNAL_ERROR response."""
        with patch.object(
            ReferenceModel, "find", side_effect=RuntimeError("db failure")
        ):
            resp = await client.get("/api/v1/references")

        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "INTERNAL_ERROR"
        assert body["error"]["message"] == "db failure"


class TestCreateReference:
    """Tests for POST /api/v1/references."""

    @pytest.mark.asyncio
    async def test_uploads_txt_file_successfully(self, client):
        """Test that uploading a TXT file creates a reference with correct fields."""
        text_content = "This is a sample legal agreement between parties."
        ref = _make_ref(
            title="agreement",
            description=text_content,
        )

        with patch.object(
            ReferenceModel, "insert", new_callable=AsyncMock
        ) as mock_insert:
            mock_insert.return_value = ref
            with patch(
                "api.routes.v1.endpoints.references.ReferenceModel",
                return_value=ref,
            ) as mock_cls:
                mock_cls.insert = mock_insert
                ref.insert = mock_insert
                resp = await client.post(
                    "/api/v1/references",
                    files={
                        "file": (
                            "agreement.txt",
                            text_content.encode(),
                            "text/plain",
                        )
                    },
                )

        assert resp.status_code == 201
        body = resp.json()
        assert body["error"] is None
        assert body["data"]["title"] == "agreement"
        assert body["data"]["type"] == "Contract"

        # Verify pdf_content stores the raw file bytes
        call_kwargs = mock_cls.call_args[1]
        assert call_kwargs["pdf_content"] == text_content.encode()

    @pytest.mark.asyncio
    async def test_uploads_pdf_file_successfully(self, client):
        """Test that uploading a PDF file extracts text and creates a reference."""
        extracted = "Extracted PDF content here."
        ref = _make_ref(
            title="contract",
            description=extracted,
        )

        with (
            patch(
                "api.routes.v1.endpoints.references._extract_text_from_pdf",
                return_value=extracted,
            ),
            patch(
                "api.routes.v1.endpoints.references.ReferenceModel",
                return_value=ref,
            ) as mock_cls,
        ):
            ref.insert = AsyncMock()
            resp = await client.post(
                "/api/v1/references",
                files={"file": ("contract.pdf", b"%PDF-fake", "application/pdf")},
            )

        assert resp.status_code == 201
        body = resp.json()
        assert body["error"] is None
        assert body["data"]["title"] == "contract"

        # Verify pdf_content stores the raw uploaded bytes
        call_kwargs = mock_cls.call_args[1]
        assert call_kwargs["pdf_content"] == b"%PDF-fake"

    @pytest.mark.asyncio
    async def test_rejects_unsupported_file_type(self, client):
        """Test that uploading a non-PDF/TXT file returns UNSUPPORTED_FILE_TYPE."""
        resp = await client.post(
            "/api/v1/references",
            files={"file": ("image.png", b"fake-png", "image/png")},
        )

        assert resp.status_code == 201
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "UNSUPPORTED_FILE_TYPE"
        assert ".png" in body["error"]["message"]

    @pytest.mark.asyncio
    async def test_truncates_description_to_200_chars(self, client):
        """Test that the description is truncated to 200 characters."""
        long_text = "A" * 300
        ref = _make_ref(title="long", description="A" * 200)

        with patch(
            "api.routes.v1.endpoints.references.ReferenceModel",
            return_value=ref,
        ) as mock_cls:
            ref.insert = AsyncMock()
            await client.post(
                "/api/v1/references",
                files={
                    "file": (
                        "long.txt",
                        long_text.encode(),
                        "text/plain",
                    )
                },
            )

        # Verify the model was constructed with truncated description
        call_kwargs = mock_cls.call_args[1]
        assert len(call_kwargs["description"]) == 200

    @pytest.mark.asyncio
    async def test_handles_extraction_error(self, client):
        """Test that a text extraction failure returns EXTRACTION_ERROR."""
        with patch(
            "api.routes.v1.endpoints.references._extract_text_from_pdf",
            side_effect=Exception("corrupt PDF"),
        ):
            resp = await client.post(
                "/api/v1/references",
                files={"file": ("broken.pdf", b"not-a-pdf", "application/pdf")},
            )

        assert resp.status_code == 201
        body = resp.json()
        assert body["data"] is None
        assert body["error"]["code"] == "EXTRACTION_ERROR"
        assert "corrupt PDF" in body["error"]["message"]

    @pytest.mark.asyncio
    async def test_uses_untitled_when_no_filename(self, client):
        """Test that a missing filename defaults to 'untitled'."""
        ref = _make_ref(title="untitled", description="content")

        with patch(
            "api.routes.v1.endpoints.references.ReferenceModel",
            return_value=ref,
        ):
            ref.insert = AsyncMock()
            # Send file with no filename extension - defaults to unsupported
            resp = await client.post(
                "/api/v1/references",
                files={
                    "file": ("notes.txt", b"content", "text/plain")
                },
            )

        assert resp.status_code == 201

    @pytest.mark.asyncio
    async def test_sets_default_type_to_contract(self, client):
        """Test that the reference type defaults to Contract."""
        ref = _make_ref(title="doc", description="text")

        with patch(
            "api.routes.v1.endpoints.references.ReferenceModel",
            return_value=ref,
        ) as mock_cls:
            ref.insert = AsyncMock()
            await client.post(
                "/api/v1/references",
                files={
                    "file": ("doc.txt", b"text", "text/plain")
                },
            )

        call_kwargs = mock_cls.call_args[1]
        assert call_kwargs["type"] == DocumentType.CONTRACT


class TestExtractTextFromPdf:
    """Tests for the _extract_text_from_pdf helper."""

    def test_extracts_text_from_valid_pdf(self):
        """Test that text is extracted from a real minimal PDF."""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Hello World"

        with patch(
            "api.routes.v1.endpoints.references.PdfReader"
        ) as mock_reader_cls:
            mock_reader_cls.return_value.pages = [mock_page]
            result = _extract_text_from_pdf(b"fake-pdf-bytes")

        assert result == "Hello World"

    def test_handles_page_with_no_text(self):
        """Test that pages returning None are treated as empty strings."""
        mock_page = MagicMock()
        mock_page.extract_text.return_value = None

        with patch(
            "api.routes.v1.endpoints.references.PdfReader"
        ) as mock_reader_cls:
            mock_reader_cls.return_value.pages = [mock_page]
            result = _extract_text_from_pdf(b"fake-pdf-bytes")

        assert result == ""

    def test_concatenates_multiple_pages(self):
        """Test that text from multiple pages is concatenated."""
        page1 = MagicMock()
        page1.extract_text.return_value = "Page 1. "
        page2 = MagicMock()
        page2.extract_text.return_value = "Page 2."

        with patch(
            "api.routes.v1.endpoints.references.PdfReader"
        ) as mock_reader_cls:
            mock_reader_cls.return_value.pages = [page1, page2]
            result = _extract_text_from_pdf(b"fake-pdf-bytes")

        assert result == "Page 1. Page 2."
