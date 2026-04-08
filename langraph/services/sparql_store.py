"""SPARQL store service for querying EU Publications Office regulations."""

import json
import re

import requests
from bs4 import BeautifulSoup
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from SPARQLWrapper import JSON, SPARQLWrapper

from langraph.models.filter_articles_llm import filter_articles_llm
from langraph.prompts.loader import load_prompt

ENDPOINT_URL = "https://publications.europa.eu/webapi/rdf/sparql"
CELLAR_BASE_URL = "https://publications.europa.eu/resource/cellar"
MAX_ARTICLE_TEXT_LENGTH = 500


def _build_query(regulation_name: str) -> str:
    """Build a SPARQL query to find a regulation by title keyword."""
    return f"""
        PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>

        SELECT DISTINCT ?work ?celex ?title
        WHERE {{
            ?work cdm:work_has_resource-type ?type .
            FILTER(?type IN (
                <http://publications.europa.eu/resource/authority/resource-type/REG>,
                <http://publications.europa.eu/resource/authority/resource-type/DIR>
            ))
            ?work cdm:resource_legal_id_celex ?celex .
            ?expr cdm:expression_belongs_to_work ?work .
            ?expr cdm:expression_uses_language
                  <http://publications.europa.eu/resource/authority/language/ENG> .
            ?expr cdm:expression_title ?title .
            FILTER(CONTAINS(LCASE(STR(?title)), LCASE("{regulation_name}")))
        }}
        LIMIT 10
    """


def _get_sparql_client() -> SPARQLWrapper:
    """Create a SPARQLWrapper client for the EU Publications Office endpoint."""
    sparql = SPARQLWrapper(ENDPOINT_URL)
    sparql.setReturnFormat(JSON)
    return sparql


def _fetch_html(cellar_uri: str) -> str:
    """Fetch the XHTML content of a regulation from the Cellar API."""
    response = requests.get(
        cellar_uri,
        headers={
            "Accept": "application/xhtml+xml, text/html",
            "Accept-Language": "en",
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.text


def _parse_articles(html: str) -> list[dict]:
    """Parse regulation HTML into individual articles.

    Supports two EUR-Lex formats:
    - Structured: ``<div id="art_5">`` containers (newer regulations like GDPR).
    - Flat: ``<p>Article 5</p>`` headings followed by content paragraphs
      (older directives like ePrivacy 2002/58/EC).

    Returns:
        List of dicts with number, title, and text for each article.
    """
    soup = BeautifulSoup(html, "html.parser")
    article_divs = soup.find_all("div", id=re.compile(r"^art_\d+$"))

    if article_divs:
        return _parse_structured_articles(article_divs)

    return _parse_flat_articles(soup)


def _parse_structured_articles(article_divs: list) -> list[dict]:
    """Parse articles from structured ``<div id="art_N">`` containers."""
    articles = []
    for div in article_divs:
        article_id = div["id"]
        number = article_id.replace("art_", "")

        title_tag = div.find("p", class_="oj-sti-art")
        title = title_tag.get_text(strip=True) if title_tag else ""

        text = div.get_text(separator=" ", strip=True)

        articles.append({"number": number, "title": title, "text": text})

    return articles


ARTICLE_HEADING_RE = re.compile(r"^Article\s+(\d+)$")


def _parse_flat_articles(soup: BeautifulSoup) -> list[dict]:
    """Parse articles from flat ``<p>`` tag sequences (older EUR-Lex format)."""
    paragraphs = soup.find_all("p")
    articles = []
    current: dict | None = None

    for p in paragraphs:
        text = p.get_text(strip=True)
        match = ARTICLE_HEADING_RE.match(text)

        if match:
            if current:
                current["text"] = " ".join(current["_parts"])
                del current["_parts"]
                articles.append(current)
            current = {
                "number": match.group(1),
                "title": "",
                "_parts": [],
            }
        elif current is not None:
            if not current["title"] and not current["_parts"]:
                current["title"] = text
            current["_parts"].append(text)

    if current:
        current["text"] = " ".join(current["_parts"])
        del current["_parts"]
        articles.append(current)

    return articles


def _filter_by_numbers(
    articles: list[dict], article_numbers: list[str]
) -> list[dict]:
    """Filter articles by exact article number match."""
    number_set = set(article_numbers)
    return [a for a in articles if a["number"] in number_set]


class FilterArticlesResult(BaseModel):
    article_numbers: list[str]


async def _filter_by_descriptions(
    articles: list[dict], article_descriptions: list[str]
) -> list[dict]:
    """Filter articles by semantic matching using an LLM."""
    prompt = load_prompt("filter_articles")

    articles_summary = json.dumps(
        [
            {
                "number": a["number"],
                "title": a["title"],
                "text": a["text"][:MAX_ARTICLE_TEXT_LENGTH],
            }
            for a in articles
        ],
        indent=2,
    )

    content_parts = [
        {"type": "text", "text": prompt},
        {
            "type": "text",
            "text": f"<articles>\n{articles_summary}\n</articles>",
        },
        {
            "type": "text",
            "text": (
                "<descriptions>\n"
                + json.dumps(article_descriptions)
                + "\n</descriptions>"
            ),
        },
    ]

    message = HumanMessage(content=content_parts)
    structured_llm = filter_articles_llm.with_structured_output(
        FilterArticlesResult
    )
    result = await structured_llm.ainvoke([message])

    matched_numbers = set(result.article_numbers)
    return [a for a in articles if a["number"] in matched_numbers]


async def search(
    regulation_name: str,
    article_numbers: list[str],
    article_descriptions: list[str] | None = None,
) -> list[dict]:
    """Search EU Publications Office for regulation articles.

    Args:
        regulation_name: Keyword to match against regulation titles.
        article_numbers: List of article number strings to filter by.
        article_descriptions: List of keyword phrases to match against article content.

    Returns:
        List of dicts with content, celex_id, regulation, and article_number.
    """
    if not regulation_name or (not article_numbers and not article_descriptions):
        return []

    sparql = _get_sparql_client()
    query = _build_query(regulation_name)
    sparql.setQuery(query)

    response = sparql.queryAndConvert()
    bindings = response.get("results", {}).get("bindings", [])

    if not bindings:
        return []

    results: list[dict] = []

    for binding in bindings:
        cellar_uri = binding.get("work", {}).get("value", "")
        celex_id = binding.get("celex", {}).get("value", "")
        title = binding.get("title", {}).get("value", "")

        if not cellar_uri:
            continue

        html = _fetch_html(cellar_uri)
        all_articles = _parse_articles(html)

        matched: list[dict] = []

        if article_numbers:
            matched.extend(_filter_by_numbers(all_articles, article_numbers))

        if article_descriptions and all_articles:
            desc_matched = await _filter_by_descriptions(
                all_articles, article_descriptions
            )
            existing_numbers = {a["number"] for a in matched}
            matched.extend(
                a for a in desc_matched if a["number"] not in existing_numbers
            )

        for article in matched:
            results.append(
                {
                    "content": article["text"],
                    "celex_id": celex_id,
                    "regulation": title,
                    "article_number": article["number"],
                }
            )

    return results
