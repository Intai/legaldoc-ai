"""Assistant API endpoints."""

import asyncio
import json
import logging

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from api.core.mcp import mcp
from api.schemas.assistant import AssistantQueryRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant", tags=["assistant"])


async def _query_events(request: AssistantQueryRequest):
    """Yield SSE token events from the RAG graph, then a complete event.

    Runs the compiled RAG graph as a background task, streams partial text
    tokens from an asyncio.Queue, and finally yields a complete event
    containing the sources array.
    """
    from langraph.app.rag_graph import build_rag_graph

    try:
        queue: asyncio.Queue = asyncio.Queue()
        state = {
            "query": request.query,
            "token_callback": queue,
        }

        graph = build_rag_graph()

        async def run_graph():
            try:
                result = await graph.ainvoke(state)
                await queue.put(("complete", result))
            except Exception as exc:
                await queue.put(("error", exc))

        logger.info("Assistant query started")
        task = asyncio.create_task(run_graph())

        while True:
            event = await queue.get()
            if isinstance(event, tuple) and event[0] == "complete":
                result = event[1]
                sources = [
                    {
                        "documentId": src["document_id"],
                        "title": src["title"],
                        "snippet": src["snippet"],
                    }
                    for src in result.get("sources", [])
                ]
                yield {
                    "event": "complete",
                    "data": json.dumps({"sources": sources}),
                }
                break
            elif isinstance(event, tuple) and event[0] == "error":
                raise event[1]
            else:
                yield {"event": "token", "data": json.dumps({"text": event})}

        await task

    except Exception as exc:
        logger.exception("Assistant query failed")
        yield {
            "event": "error",
            "data": json.dumps({
                "message": str(exc),
                "code": "INTERNAL_ERROR",
            }),
        }


@router.post("/query", response_model=None)
async def query_assistant(request: AssistantQueryRequest):
    """Query the assistant using RAG to answer questions about documents.

    Accepts a query string, then streams SSE events: token events for partial
    text as the answer is generated, and a final complete event with the
    sources array (each source has documentId, title, snippet).
    """
    return EventSourceResponse(_query_events(request))


@mcp.tool()
async def mcp_query_assistant(query: str) -> dict:
    """Query the legal document assistant and return an answer with source citations.

    Accepts a query string about generated legal documents in the system
    and returns a dict containing the complete answer text
    and an array of source references with snippets.

    Args:
        query: The question to answer using the generated legal documents.

    Returns:
        A dict with 'answer' (the synthesised text) and 'sources' (list of
        dicts each containing documentId, title, snippet).
    """
    request = AssistantQueryRequest(query=query)
    tokens: list[str] = []
    sources: list[dict] = []

    async for event in _query_events(request):
        parsed = json.loads(event["data"])
        if event["event"] == "error":
            raise RuntimeError(parsed["message"])
        if event["event"] == "token":
            tokens.append(parsed["text"])
        elif event["event"] == "complete":
            sources = parsed["sources"]

    return {"answer": "".join(tokens), "sources": sources}
