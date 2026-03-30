import asyncio

from langraph.app.state import GenerateDocumentState


def test_create_state_with_required_fields_only():
    state: GenerateDocumentState = {
        "references": [b"%PDF-1.4 fake"],
        "context": "Draft a lease agreement",
    }
    assert state["references"] == [b"%PDF-1.4 fake"]
    assert state["context"] == "Draft a lease agreement"


def test_create_state_with_all_optional_fields():
    queue: asyncio.Queue = asyncio.Queue()
    state: GenerateDocumentState = {
        "references": [b"ref1", b"ref2"],
        "context": "NDA between two parties",
        "title": "Non-Disclosure Agreement",
        "doc_type": "NDA",
        "analysis": "Standard mutual NDA",
        "outline": "1. Definitions\n2. Obligations",
        "draft": "This agreement is entered into...",
        "sections": [{"heading": "Definitions", "body": "..."}],
        "description": "A mutual NDA",
        "phase_callback": queue,
    }
    assert state["title"] == "Non-Disclosure Agreement"
    assert state["doc_type"] == "NDA"
    assert state["analysis"] == "Standard mutual NDA"
    assert state["outline"] == "1. Definitions\n2. Obligations"
    assert state["draft"] == "This agreement is entered into..."
    assert state["sections"] == [{"heading": "Definitions", "body": "..."}]
    assert state["description"] == "A mutual NDA"
    assert state["phase_callback"] is queue


def test_state_with_empty_references():
    state: GenerateDocumentState = {
        "references": [],
        "context": "",
    }
    assert state["references"] == []
    assert state["context"] == ""


def test_state_with_multiple_references():
    refs = [b"pdf1", b"pdf2", b"pdf3"]
    state: GenerateDocumentState = {
        "references": refs,
        "context": "Compare these documents",
    }
    assert len(state["references"]) == 3


def test_state_sections_contains_structured_dicts():
    state: GenerateDocumentState = {
        "references": [b"ref"],
        "context": "Generate contract",
        "sections": [
            {"heading": "Preamble", "body": "Whereas..."},
            {"heading": "Terms", "body": "The parties agree..."},
        ],
    }
    assert len(state["sections"]) == 2
    assert state["sections"][0]["heading"] == "Preamble"
    assert state["sections"][1]["heading"] == "Terms"
