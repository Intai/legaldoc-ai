import json

from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from langraph.models.parse_llm import parse_llm
from langraph.prompts.loader import load_prompt
from langraph.services import vector_store


class Clause(BaseModel):
    clause_type: str
    heading: str
    content: str


class ParseClausesResult(BaseModel):
    clauses: list[Clause]


async def ingest_node(state: dict) -> dict:
    """Extract clause-level chunks from sections and upsert into the vector store."""
    phase_callback = state.get("phase_callback")
    if phase_callback:
        await phase_callback.put("ingesting")

    prompt = load_prompt("parse_clauses")

    sections_text = json.dumps(state["sections"], indent=2)

    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {"type": "text", "text": sections_text},
        ]
    )

    structured_llm = parse_llm.with_structured_output(ParseClausesResult)
    result = await structured_llm.ainvoke([message])
    clauses = result.clauses

    document_id = state["document_id"]
    title = state["title"]
    doc_type = state["doc_type"]

    chunks = [
        {
            "content": clause.content,
            "document_id": document_id,
            "title": title,
            "type": doc_type,
            "clause_type": clause.clause_type,
            "heading": clause.heading,
        }
        for clause in clauses
    ]

    vector_store.upsert_chunks(chunks)

    return {}
