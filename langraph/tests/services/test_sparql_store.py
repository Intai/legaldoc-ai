"""Tests for the SPARQL store service."""

import importlib
import sys
from types import ModuleType
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

SAMPLE_HTML = """
<html>
<body>
<div class="eli-main-title">
  <p class="oj-doc-ti">Regulation (EU) 2016/679</p>
</div>
<div class="eli-subdivision" id="art_5">
  <p class="oj-ti-art">Article 5</p>
  <div class="eli-title" id="art_5.tit_1">
    <p class="oj-sti-art">Principles relating to processing of personal data</p>
  </div>
  <div id="005.001">
    <p class="oj-normal">1. Personal data shall be processed lawfully.</p>
  </div>
</div>
<div class="eli-subdivision" id="art_17">
  <p class="oj-ti-art">Article 17</p>
  <div class="eli-title" id="art_17.tit_1">
    <p class="oj-sti-art">Right to erasure (\u2018right to be forgotten\u2019)</p>
  </div>
  <div id="017.001">
    <p class="oj-normal">1. The data subject shall have the right to obtain
    from the controller the erasure of personal data.</p>
  </div>
</div>
<div class="eli-subdivision" id="art_20">
  <p class="oj-ti-art">Article 20</p>
  <div class="eli-title" id="art_20.tit_1">
    <p class="oj-sti-art">Right to data portability</p>
  </div>
  <div id="020.001">
    <p class="oj-normal">1. The data subject shall have the right to receive
    personal data in a structured format.</p>
  </div>
</div>
</body>
</html>
"""

SAMPLE_FLAT_HTML = """
<html>
<body>
<p>Article 5</p>
<p>Confidentiality of the communications</p>
<p>1. Member States shall ensure the confidentiality of communications.</p>
<p>2. Paragraph 1 shall not affect any legally authorised recording.</p>
<p>Article 6</p>
<p>Traffic data</p>
<p>1. Traffic data relating to subscribers must be erased.</p>
</body>
</html>
"""

SPARQL_RESPONSE = {
    "results": {
        "bindings": [
            {
                "work": {
                    "value": "http://publications.europa.eu/resource/cellar/abc123"
                },
                "celex": {"value": "32016R0679"},
                "title": {"value": "General Data Protection Regulation"},
            }
        ]
    }
}


@pytest.fixture()
def mock_llm():
    llm = MagicMock()
    structured = AsyncMock()
    llm.with_structured_output.return_value = structured
    return llm


@pytest.fixture()
def sparql_store_module(mock_llm):
    """Import services.sparql_store with external deps mocked."""
    fake_sparqlwrapper = ModuleType("SPARQLWrapper")
    fake_sparqlwrapper.SPARQLWrapper = MagicMock()
    fake_sparqlwrapper.JSON = "json"

    fake_bs4 = ModuleType("bs4")
    from bs4 import BeautifulSoup

    fake_bs4.BeautifulSoup = BeautifulSoup

    fake_requests = MagicMock()

    fake_filter_llm_mod = ModuleType("langraph.models.filter_articles_llm")
    fake_filter_llm_mod.filter_articles_llm = mock_llm

    fake_loader_mod = ModuleType("langraph.prompts.loader")
    fake_loader_mod.load_prompt = MagicMock(return_value="Filter articles prompt")

    sys.modules.pop("langraph.services.sparql_store", None)

    with patch.dict(
        sys.modules,
        {
            "SPARQLWrapper": fake_sparqlwrapper,
            "bs4": fake_bs4,
            "requests": fake_requests,
            "langraph.models.filter_articles_llm": fake_filter_llm_mod,
            "langraph.prompts.loader": fake_loader_mod,
        },
    ):
        mod = importlib.import_module("langraph.services.sparql_store")
        mod._fake_sparqlwrapper_cls = fake_sparqlwrapper.SPARQLWrapper
        mod._fake_requests = fake_requests
        yield mod

    sys.modules.pop("langraph.services.sparql_store", None)


class TestConstants:
    def test_endpoint_url(self, sparql_store_module):
        assert sparql_store_module.ENDPOINT_URL == (
            "https://publications.europa.eu/webapi/rdf/sparql"
        )


class TestBuildQuery:
    def test_contains_regulation_name(self, sparql_store_module):
        query = sparql_store_module._build_query("General Data Protection Regulation")
        assert 'LCASE("General Data Protection Regulation")' in query

    def test_filters_by_resource_type(self, sparql_store_module):
        query = sparql_store_module._build_query("GDPR")
        assert "resource-type/REG" in query
        assert "resource-type/DIR" in query


    def test_filters_by_english_language(self, sparql_store_module):
        query = sparql_store_module._build_query("GDPR")
        assert "language/ENG" in query

    def test_uses_expression_title(self, sparql_store_module):
        query = sparql_store_module._build_query("GDPR")
        assert "expression_title" in query


class TestGetSparqlClient:
    def test_creates_client_with_endpoint(self, sparql_store_module):
        sparql_store_module._get_sparql_client()
        sparql_store_module._fake_sparqlwrapper_cls.assert_called_once_with(
            sparql_store_module.ENDPOINT_URL
        )

    def test_sets_json_return_format(self, sparql_store_module):
        client = sparql_store_module._fake_sparqlwrapper_cls.return_value
        sparql_store_module._get_sparql_client()
        client.setReturnFormat.assert_called_once_with("json")


class TestFetchHtml:
    def test_sends_correct_headers(self, sparql_store_module):
        mock_response = MagicMock()
        mock_response.text = "<html></html>"
        sparql_store_module._fake_requests.get.return_value = mock_response

        sparql_store_module._fetch_html("http://example.com/cellar/abc")

        sparql_store_module._fake_requests.get.assert_called_once_with(
            "http://example.com/cellar/abc",
            headers={
                "Accept": "application/xhtml+xml, text/html",
                "Accept-Language": "en",
            },
            timeout=30,
        )

    def test_returns_response_text(self, sparql_store_module):
        mock_response = MagicMock()
        mock_response.text = "<html>content</html>"
        sparql_store_module._fake_requests.get.return_value = mock_response

        result = sparql_store_module._fetch_html("http://example.com/cellar/abc")
        assert result == "<html>content</html>"


class TestParseArticles:
    def test_extracts_article_numbers(self, sparql_store_module):
        articles = sparql_store_module._parse_articles(SAMPLE_HTML)
        numbers = [a["number"] for a in articles]
        assert numbers == ["5", "17", "20"]

    def test_extracts_article_titles(self, sparql_store_module):
        articles = sparql_store_module._parse_articles(SAMPLE_HTML)
        expected_0 = "Principles relating to processing of personal data"
        assert articles[0]["title"] == expected_0
        expected_1 = "Right to erasure (\u2018right to be forgotten\u2019)"
        assert articles[1]["title"] == expected_1

    def test_extracts_article_text(self, sparql_store_module):
        articles = sparql_store_module._parse_articles(SAMPLE_HTML)
        assert "processed lawfully" in articles[0]["text"]

    def test_empty_html_returns_empty_list(self, sparql_store_module):
        articles = sparql_store_module._parse_articles("<html></html>")
        assert articles == []


class TestParseArticlesFlatFormat:
    def test_extracts_article_numbers(self, sparql_store_module):
        articles = sparql_store_module._parse_articles(SAMPLE_FLAT_HTML)
        numbers = [a["number"] for a in articles]
        assert numbers == ["5", "6"]

    def test_extracts_article_titles(self, sparql_store_module):
        articles = sparql_store_module._parse_articles(SAMPLE_FLAT_HTML)
        assert articles[0]["title"] == "Confidentiality of the communications"
        assert articles[1]["title"] == "Traffic data"

    def test_extracts_article_text(self, sparql_store_module):
        articles = sparql_store_module._parse_articles(SAMPLE_FLAT_HTML)
        assert "confidentiality of communications" in articles[0]["text"].lower()

    def test_title_included_in_text(self, sparql_store_module):
        articles = sparql_store_module._parse_articles(SAMPLE_FLAT_HTML)
        assert "Confidentiality" in articles[0]["text"]

    def test_empty_html_returns_empty_list(self, sparql_store_module):
        html = "<html><p>No articles</p></html>"
        articles = sparql_store_module._parse_articles(html)
        assert articles == []


class TestFilterByNumbers:
    def test_matches_exact_numbers(self, sparql_store_module):
        articles = [
            {"number": "5", "title": "A", "text": "a"},
            {"number": "17", "title": "B", "text": "b"},
            {"number": "20", "title": "C", "text": "c"},
        ]
        result = sparql_store_module._filter_by_numbers(articles, ["17", "5"])
        numbers = [a["number"] for a in result]
        assert "5" in numbers
        assert "17" in numbers
        assert "20" not in numbers

    def test_no_match_returns_empty(self, sparql_store_module):
        articles = [{"number": "5", "title": "A", "text": "a"}]
        result = sparql_store_module._filter_by_numbers(articles, ["99"])
        assert result == []


class TestFilterByDescriptions:
    async def test_calls_llm_with_articles_and_descriptions(
        self, sparql_store_module, mock_llm
    ):
        structured = mock_llm.with_structured_output.return_value
        mock_result = MagicMock()
        mock_result.article_numbers = ["17"]
        structured.ainvoke.return_value = mock_result

        articles = [
            {"number": "5", "title": "Principles", "text": "processing"},
            {"number": "17", "title": "Right to erasure", "text": "erasure"},
        ]
        result = await sparql_store_module._filter_by_descriptions(
            articles, ["right to erasure"]
        )

        structured.ainvoke.assert_called_once()
        assert len(result) == 1
        assert result[0]["number"] == "17"

    async def test_returns_empty_when_llm_finds_no_match(
        self, sparql_store_module, mock_llm
    ):
        structured = mock_llm.with_structured_output.return_value
        mock_result = MagicMock()
        mock_result.article_numbers = []
        structured.ainvoke.return_value = mock_result

        articles = [{"number": "5", "title": "A", "text": "a"}]
        result = await sparql_store_module._filter_by_descriptions(
            articles, ["nonexistent topic"]
        )
        assert result == []


class TestSearch:
    async def test_returns_mapped_results_for_article_numbers(
        self, sparql_store_module
    ):
        client = MagicMock()
        client.queryAndConvert.return_value = SPARQL_RESPONSE

        with (
            patch.object(
                sparql_store_module, "_get_sparql_client", return_value=client
            ),
            patch.object(
                sparql_store_module, "_fetch_html", return_value=SAMPLE_HTML
            ),
        ):
            results = await sparql_store_module.search(
                "General Data Protection Regulation", ["17"]
            )

        assert len(results) == 1
        assert results[0]["article_number"] == "17"
        assert results[0]["celex_id"] == "32016R0679"
        assert results[0]["regulation"] == "General Data Protection Regulation"
        assert "erasure" in results[0]["content"]

    async def test_returns_empty_for_empty_regulation_name(
        self, sparql_store_module
    ):
        result = await sparql_store_module.search("", ["5"])
        assert result == []

    async def test_returns_empty_when_no_numbers_and_no_descriptions(
        self, sparql_store_module
    ):
        result = await sparql_store_module.search("GDPR", [])
        assert result == []

    async def test_returns_empty_when_sparql_finds_nothing(
        self, sparql_store_module
    ):
        client = MagicMock()
        client.queryAndConvert.return_value = {"results": {"bindings": []}}

        with patch.object(
            sparql_store_module, "_get_sparql_client", return_value=client
        ):
            results = await sparql_store_module.search(
                "Nonexistent Regulation", ["1"]
            )

        assert results == []

    async def test_calls_filter_by_descriptions_for_descriptions(
        self, sparql_store_module, mock_llm
    ):
        client = MagicMock()
        client.queryAndConvert.return_value = SPARQL_RESPONSE

        structured = mock_llm.with_structured_output.return_value
        mock_result = MagicMock()
        mock_result.article_numbers = ["17"]
        structured.ainvoke.return_value = mock_result

        with (
            patch.object(
                sparql_store_module, "_get_sparql_client", return_value=client
            ),
            patch.object(
                sparql_store_module, "_fetch_html", return_value=SAMPLE_HTML
            ),
        ):
            results = await sparql_store_module.search(
                "General Data Protection Regulation",
                [],
                ["right to erasure"],
            )

        assert len(results) == 1
        assert results[0]["article_number"] == "17"

    async def test_combines_numbers_and_descriptions_without_duplicates(
        self, sparql_store_module, mock_llm
    ):
        client = MagicMock()
        client.queryAndConvert.return_value = SPARQL_RESPONSE

        structured = mock_llm.with_structured_output.return_value
        mock_result = MagicMock()
        mock_result.article_numbers = ["17", "20"]
        structured.ainvoke.return_value = mock_result

        with (
            patch.object(
                sparql_store_module, "_get_sparql_client", return_value=client
            ),
            patch.object(
                sparql_store_module, "_fetch_html", return_value=SAMPLE_HTML
            ),
        ):
            results = await sparql_store_module.search(
                "General Data Protection Regulation",
                ["17"],
                ["right to erasure", "data portability"],
            )

        numbers = [r["article_number"] for r in results]
        assert "17" in numbers
        assert "20" in numbers
        assert numbers.count("17") == 1

    async def test_multiple_bindings(self, sparql_store_module):
        client = MagicMock()
        client.queryAndConvert.return_value = {
            "results": {
                "bindings": [
                    {
                        "work": {"value": "http://example.com/cellar/a"},
                        "celex": {"value": "CELEX1"},
                        "title": {"value": "Regulation A"},
                    },
                    {
                        "work": {"value": "http://example.com/cellar/b"},
                        "celex": {"value": "CELEX2"},
                        "title": {"value": "Regulation B"},
                    },
                ]
            }
        }

        with (
            patch.object(
                sparql_store_module, "_get_sparql_client", return_value=client
            ),
            patch.object(
                sparql_store_module, "_fetch_html", return_value=SAMPLE_HTML
            ),
        ):
            results = await sparql_store_module.search("Regulation", ["5"])

        assert len(results) == 2
        assert results[0]["celex_id"] == "CELEX1"
        assert results[1]["celex_id"] == "CELEX2"

    async def test_skips_binding_without_work_uri(self, sparql_store_module):
        client = MagicMock()
        client.queryAndConvert.return_value = {
            "results": {
                "bindings": [
                    {
                        "celex": {"value": "CELEX1"},
                        "title": {"value": "Reg"},
                    }
                ]
            }
        }

        with patch.object(
            sparql_store_module, "_get_sparql_client", return_value=client
        ):
            results = await sparql_store_module.search("Reg", ["5"])

        assert results == []
