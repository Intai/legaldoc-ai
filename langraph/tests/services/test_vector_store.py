"""Tests for the vector store service."""

import sys
from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture()
def vector_store_module():
    """Import services.vector_store with external deps mocked."""
    # Create fake google.genai module
    fake_google = ModuleType("google")
    fake_genai = ModuleType("google.genai")
    fake_genai.Client = MagicMock()
    fake_google.genai = fake_genai

    fake_genai_types = ModuleType("google.genai.types")
    fake_genai_types.EmbedContentConfig = MagicMock()

    # Create fake qdrant_client module
    fake_qdrant_client = ModuleType("qdrant_client")
    fake_qdrant_client.QdrantClient = MagicMock()

    fake_qdrant_models = ModuleType("qdrant_client.models")
    fake_qdrant_models.Distance = MagicMock()
    fake_qdrant_models.Distance.COSINE = "Cosine"
    fake_qdrant_models.FieldCondition = MagicMock()
    fake_qdrant_models.Filter = MagicMock()
    fake_qdrant_models.MatchValue = MagicMock()
    fake_qdrant_models.PointStruct = MagicMock()
    fake_qdrant_models.VectorParams = MagicMock()

    # Clear cached module
    sys.modules.pop("langraph.services.vector_store", None)

    with patch.dict(
        sys.modules,
        {
            "google": fake_google,
            "google.genai": fake_genai,
            "google.genai.types": fake_genai_types,
            "qdrant_client": fake_qdrant_client,
            "qdrant_client.models": fake_qdrant_models,
        },
    ):
        import importlib

        mod = importlib.import_module("langraph.services.vector_store")
        # Store references on the module for assertion convenience
        mod._fake_qdrant_client_cls = fake_qdrant_client.QdrantClient
        mod._fake_genai_client_cls = fake_genai.Client
        mod._fake_qdrant_models = fake_qdrant_models
        mod._fake_genai_types = fake_genai_types
        yield mod

    # Cleanup
    sys.modules.pop("langraph.services.vector_store", None)


@pytest.fixture()
def sample_chunks():
    """Return sample chunk dicts for testing."""
    return [
        {
            "content": "The tenant shall pay rent monthly.",
            "document_id": "doc-1",
            "title": "Lease Agreement",
            "type": "contract",
            "clause_type": "payment",
            "heading": "Section 3: Rent",
        },
        {
            "content": "Either party may terminate with 30 days notice.",
            "document_id": "doc-1",
            "title": "Lease Agreement",
            "type": "contract",
            "clause_type": "termination",
            "heading": "Section 7: Termination",
        },
    ]


class TestConstants:
    """Tests for module-level constants."""

    def test_collection_name(self, vector_store_module):
        assert vector_store_module.COLLECTION_NAME == "legal_documents"

    def test_embedding_model(self, vector_store_module):
        assert vector_store_module.EMBEDDING_MODEL == "gemini-embedding-2-preview"

    def test_vector_size(self, vector_store_module):
        assert vector_store_module.VECTOR_SIZE == 3072


class TestGetQdrantClient:
    """Tests for _get_qdrant_client."""

    @patch.dict("os.environ", {"QDRANT_HOST": "myhost", "QDRANT_PORT": "6334"})
    def test_custom_env(self, vector_store_module):
        vector_store_module._get_qdrant_client()
        vector_store_module._fake_qdrant_client_cls.assert_called_with(
            host="myhost", port=6334
        )

    @patch.dict("os.environ", {}, clear=True)
    def test_defaults(self, vector_store_module):
        vector_store_module._get_qdrant_client()
        vector_store_module._fake_qdrant_client_cls.assert_called_with(
            host="qdrant", port=6333
        )


class TestGetGenaiClient:
    """Tests for _get_genai_client."""

    @patch.dict("os.environ", {"GOOGLE_API_KEY": "test-key"})
    def test_with_key(self, vector_store_module):
        vector_store_module._get_genai_client()
        vector_store_module._fake_genai_client_cls.assert_called_with(
            api_key="test-key"
        )

    @patch.dict("os.environ", {}, clear=True)
    def test_default_empty(self, vector_store_module):
        vector_store_module._get_genai_client()
        vector_store_module._fake_genai_client_cls.assert_called_with(api_key="")


class TestInitCollection:
    """Tests for init_collection."""

    def test_creates_when_not_exists(self, vector_store_module):
        client = MagicMock()
        client.collection_exists.return_value = False

        with patch.object(
            vector_store_module, "_get_qdrant_client", return_value=client
        ):
            vector_store_module.init_collection()

        client.collection_exists.assert_called_once_with(
            vector_store_module.COLLECTION_NAME
        )
        client.create_collection.assert_called_once()
        call_kwargs = client.create_collection.call_args.kwargs
        assert call_kwargs["collection_name"] == vector_store_module.COLLECTION_NAME

    def test_skips_when_exists(self, vector_store_module):
        client = MagicMock()
        client.collection_exists.return_value = True

        with patch.object(
            vector_store_module, "_get_qdrant_client", return_value=client
        ):
            vector_store_module.init_collection()

        client.collection_exists.assert_called_once_with(
            vector_store_module.COLLECTION_NAME
        )
        client.create_collection.assert_not_called()


class TestClearCollection:
    """Tests for clear_collection."""

    def test_deletes_and_recreates_when_exists(self, vector_store_module):
        client = MagicMock()
        client.collection_exists.return_value = True

        with patch.object(
            vector_store_module, "_get_qdrant_client", return_value=client
        ):
            vector_store_module.clear_collection()

        client.collection_exists.assert_called_once_with(
            vector_store_module.COLLECTION_NAME
        )
        client.delete_collection.assert_called_once_with(
            vector_store_module.COLLECTION_NAME
        )
        client.create_collection.assert_called_once()
        call_kwargs = client.create_collection.call_args.kwargs
        assert call_kwargs["collection_name"] == vector_store_module.COLLECTION_NAME

    def test_creates_when_not_exists(self, vector_store_module):
        client = MagicMock()
        client.collection_exists.return_value = False

        with patch.object(
            vector_store_module, "_get_qdrant_client", return_value=client
        ):
            vector_store_module.clear_collection()

        client.delete_collection.assert_not_called()
        client.create_collection.assert_called_once()


class TestUpsertChunks:
    """Tests for upsert_chunks."""

    def test_upserts_chunks(self, vector_store_module, sample_chunks):
        qdrant = MagicMock()
        genai_client = MagicMock()

        emb1 = MagicMock()
        emb1.values = [0.1] * 3072
        emb2 = MagicMock()
        emb2.values = [0.2] * 3072
        response = MagicMock()
        response.embeddings = [emb1, emb2]
        genai_client.models.embed_content.return_value = response

        with (
            patch.object(
                vector_store_module, "_get_qdrant_client", return_value=qdrant
            ),
            patch.object(
                vector_store_module, "_get_genai_client", return_value=genai_client
            ),
            patch.object(vector_store_module.uuid, "uuid4") as mock_uuid,
        ):
            mock_uuid.side_effect = [
                MagicMock(__str__=lambda s: "uuid-1"),
                MagicMock(__str__=lambda s: "uuid-2"),
            ]
            vector_store_module.upsert_chunks(sample_chunks)

        genai_client.models.embed_content.assert_called_once()
        call_kwargs = genai_client.models.embed_content.call_args.kwargs
        assert call_kwargs["model"] == vector_store_module.EMBEDDING_MODEL
        assert call_kwargs["contents"] == [c["content"] for c in sample_chunks]

        qdrant.upsert.assert_called_once()
        upsert_kwargs = qdrant.upsert.call_args.kwargs
        assert upsert_kwargs["collection_name"] == vector_store_module.COLLECTION_NAME
        points = upsert_kwargs["points"]
        assert len(points) == 2

    def test_empty_chunks(self, vector_store_module):
        with (
            patch.object(
                vector_store_module, "_get_qdrant_client"
            ) as mock_get_qdrant,
            patch.object(
                vector_store_module, "_get_genai_client"
            ) as mock_get_genai,
        ):
            vector_store_module.upsert_chunks([])
            mock_get_qdrant.assert_not_called()
            mock_get_genai.assert_not_called()


class TestSearch:
    """Tests for search."""

    def test_returns_results(self, vector_store_module):
        genai_client = MagicMock()
        emb = MagicMock()
        emb.values = [0.5] * 3072
        response = MagicMock()
        response.embeddings = [emb]
        genai_client.models.embed_content.return_value = response

        qdrant = MagicMock()
        point = MagicMock()
        point.payload = {
            "content": "Some clause",
            "document_id": "doc-2",
            "title": "NDA",
            "type": "agreement",
            "clause_type": "confidentiality",
            "heading": "Section 1",
        }
        point.score = 0.95
        query_result = MagicMock()
        query_result.points = [point]
        qdrant.query_points.return_value = query_result

        with (
            patch.object(
                vector_store_module, "_get_qdrant_client", return_value=qdrant
            ),
            patch.object(
                vector_store_module, "_get_genai_client", return_value=genai_client
            ),
        ):
            results = vector_store_module.search("confidentiality clause", top_k=5)

        genai_client.models.embed_content.assert_called_once()
        call_kwargs = genai_client.models.embed_content.call_args.kwargs
        assert call_kwargs["model"] == vector_store_module.EMBEDDING_MODEL
        assert call_kwargs["contents"] == ["confidentiality clause"]

        qdrant.query_points.assert_called_once()
        q_kwargs = qdrant.query_points.call_args.kwargs
        assert q_kwargs["collection_name"] == vector_store_module.COLLECTION_NAME
        assert q_kwargs["query"] == [0.5] * 3072
        assert q_kwargs["limit"] == 5
        assert q_kwargs["with_payload"] is True

        assert len(results) == 1
        assert results[0]["content"] == "Some clause"
        assert results[0]["document_id"] == "doc-2"
        assert results[0]["score"] == 0.95

    def test_default_top_k(self, vector_store_module):
        genai_client = MagicMock()
        emb = MagicMock()
        emb.values = [0.1] * 3072
        response = MagicMock()
        response.embeddings = [emb]
        genai_client.models.embed_content.return_value = response

        qdrant = MagicMock()
        query_result = MagicMock()
        query_result.points = []
        qdrant.query_points.return_value = query_result

        with (
            patch.object(
                vector_store_module, "_get_qdrant_client", return_value=qdrant
            ),
            patch.object(
                vector_store_module, "_get_genai_client", return_value=genai_client
            ),
        ):
            vector_store_module.search("test query")

        q_kwargs = qdrant.query_points.call_args.kwargs
        assert q_kwargs["limit"] == 10

    def test_empty_payload_fields(self, vector_store_module):
        """Covers the .get() default fallback for missing payload keys."""
        genai_client = MagicMock()
        emb = MagicMock()
        emb.values = [0.1] * 3072
        response = MagicMock()
        response.embeddings = [emb]
        genai_client.models.embed_content.return_value = response

        qdrant = MagicMock()
        point = MagicMock()
        point.payload = {}
        point.score = 0.5
        query_result = MagicMock()
        query_result.points = [point]
        qdrant.query_points.return_value = query_result

        with (
            patch.object(
                vector_store_module, "_get_qdrant_client", return_value=qdrant
            ),
            patch.object(
                vector_store_module, "_get_genai_client", return_value=genai_client
            ),
        ):
            results = vector_store_module.search("query")

        assert results[0]["content"] == ""
        assert results[0]["document_id"] == ""
        assert results[0]["title"] == ""
        assert results[0]["type"] == ""
        assert results[0]["clause_type"] == ""
        assert results[0]["heading"] == ""
        assert results[0]["score"] == 0.5


class TestDeleteByDocument:
    """Tests for delete_by_document."""

    def test_deletes_with_filter(self, vector_store_module):
        qdrant = MagicMock()

        with patch.object(
            vector_store_module, "_get_qdrant_client", return_value=qdrant
        ):
            vector_store_module.delete_by_document("doc-42")

        qdrant.delete.assert_called_once()
        call_kwargs = qdrant.delete.call_args.kwargs
        assert call_kwargs["collection_name"] == vector_store_module.COLLECTION_NAME
