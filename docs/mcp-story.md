As a developer, I want to add an MCP (Model Context Protocol) server to the existing FastAPI app so that AI clients like Claude Code can interact with the LegalDoc AI system — listing documents and references, querying the RAG assistant, updating document status, and generating documents.

## Requirements

- Add the `mcp` Python SDK as a dependency.
- Create a FastMCP instance in `api/core/` to avoid circular imports between endpoint files and `api/main.py`.
- Add 5 MCP tools colocated with their corresponding REST endpoint files, sharing query and serialization logic:
  - `mcp_list_references` — list available reference documents with optional type filter.
  - `mcp_list_documents` — list generated documents with cursor-based pagination, sort, and optional type filter. Include a `pdfUrl` field for each document.
  - `mcp_update_document_status` — update a document's status (draft/done).
  - `mcp_query_assistant` — ask questions about documents via RAG, returning answer and sources.
  - `mcp_generate_document` — submit a document generation request, returning the new document ID.
- `mcp_query_assistant` and `mcp_generate_document` must reuse the existing `_query_events` and `_generate_events` async generators rather than duplicating graph invocation logic.
- `mcp_list_documents` must use the same cursor-based pagination as the REST endpoint for consistency.
- Mount the MCP Streamable HTTP sub-app at `/` in FastAPI so the sub-app's internal `/mcp` route serves at `/mcp`. Run `mcp.session_manager.run()` in the FastAPI lifespan since Starlette does not trigger sub-app lifespans for mounted apps.
- Configure the MCP server in `.mcp.json` with `"type": "http"`.

## Tasks

**Parallel tasks 1-4:**

1. Use backend-developer subagent to add `mcp[cli]>=1.27` to @api/pyproject.toml dependencies.
2. Use backend-developer subagent to create the FastMCP instance @api/core/mcp.py. Instantiate `FastMCP("legaldoc-ai")` and export it. This module exists solely to break the circular import between endpoint files and `api/main.py`.
3. Use backend-developer subagent to add the legaldoc-ai MCP server entry to @.mcp.json. Add `"legaldoc-ai": {"type": "http", "url": "http://localhost:8000/mcp"}` alongside the existing shadcn entry.
4. Use qa-tester subagent to plan BDD scenarios @web/src/documents/docs/mcp.feature.

**Parallel after task 2 completes:**

5. Use backend-developer subagent to add `mcp_list_references` tool to @api/routes/v1/endpoints/references.py. Import `mcp` from `api.core.mcp`. Extract the query and serialization logic from the `list_references` REST endpoint into a shared helper. Register an `@mcp.tool()` function with optional `type` parameter that calls the shared helper and returns a list of dicts with `id`, `title`, `type`, `description`, `createdAt`.
6. Use backend-developer subagent to add `mcp_query_assistant` tool to @api/routes/v1/endpoints/assistant.py. Import `mcp` from `api.core.mcp`. Register an `@mcp.tool()` function with a `query` parameter. Consume the existing `_query_events` async generator, accumulate token texts into the full answer, and return a dict with `answer` and `sources` from the complete event. Raise on error events.
7. Use backend-developer subagent to mount the MCP server into the FastAPI app @api/main.py. Import `mcp` from `api.core.mcp`. Call `app.mount("/", mcp.streamable_http_app())` in `create_app()` before `instrument_app()` — mount at `/` so the sub-app's internal `/mcp` route serves at `/mcp`. Keep `async with mcp.session_manager.run()` in the lifespan wrapping the `yield`, since Starlette does not trigger sub-app lifespans for mounted apps.

**Sequential tasks 8-9 after task 2 completes:**

8. Use backend-developer subagent to add `mcp_list_documents` and `mcp_update_document_status` tools to @api/routes/v1/endpoints/documents.py. Import `mcp` from `api.core.mcp`. For `mcp_list_documents`: extract the query, pagination, and serialization logic from the `list_documents` REST endpoint into a shared helper. Register an `@mcp.tool()` function with `type`, `sort`, `cursor`, and `limit` parameters that calls the shared helper and returns a dict with `documents` (including `pdfUrl` derived from `/api/v1/documents/{id}/pdf`) and `nextCursor`. For `mcp_update_document_status`: register an `@mcp.tool()` function with `document_id` and `status` parameters that reuses the existing `find_one_and_update` logic from the `update_document_status` REST endpoint and returns the updated document dict.
9. Use backend-developer subagent to add `mcp_generate_document` tool to @api/routes/v1/endpoints/documents.py. Register an `@mcp.tool()` function with `reference_ids` and `context` parameters. Consume the existing `_generate_events` async generator, skip phase events, and return the complete event's `documentId`. Raise on error events.
