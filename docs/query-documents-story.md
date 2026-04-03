As a user, I want to ask natural language questions about my legal documents via the search input — such as "What clauses do we typically use for termination?" — so that I can quickly find and understand relevant clauses, wording, and patterns across all my saved documents.

## Requirements

- Add Qdrant as a vector database service in Docker Compose, with persistent storage and a dashboard accessible at port 6333.
- Create a vector store service that uses Google `gemini-embedding-2-preview` for embeddings and Qdrant for storage. Use `task_type=RETRIEVAL_DOCUMENT` when embedding document chunks and `task_type=RETRIEVAL_QUERY` when embedding user queries.
- After the generation graph finalizes a document and the endpoint creates the MongoDB record, run a non-blocking ingestion pipeline as a background task. The ingestion uses an LLM to parse the finalize node's `sections` output into clause-level chunks, embeds them via Gemini, and upserts them into Qdrant with metadata (document ID, title, type, clause type, heading). The user sees the "complete" SSE event immediately without waiting for ingestion.
- Add an `ingest` node to the generation LangGraph after `finalize`. The endpoint generates the document ID upfront and passes it in graph state, so both the endpoint and ingest node use the same ID without a callback. The finalize node signals "ready" via the phase callback queue, the endpoint creates the document and yields the SSE "complete" event, and ingestion proceeds using the pre-generated ID. The user does not wait for ingestion to finish.
- Create a separate RAG query LangGraph with three nodes: `retrieve` (embed query and search Qdrant for top-k chunks), `rerank` (LLM re-ranks chunks by relevance), and `answer` (LLM synthesizes a response with citations, streamed via token callback).
- Add a `POST /api/v1/assistant/query` SSE endpoint that accepts a query string and streams `token` events (partial answer text) and a `complete` event (with source document citations including document ID, title, and snippet).
- Repurpose the search input in the app shell topbar as an AI prompt input. Keep the Search icon. Widen the max width to 480px. On Enter, submit the query to the assistant endpoint.
- Display AI responses in a dropdown panel below the search input (Spotlight-style). Show streamed answer text and source citations as clickable links to `/documents/:id`. Dismiss on click-outside or Escape.
- LLM configuration for parsing, re-ranking, and answer synthesis follows the existing provider pattern (`LANGGRAPH_LLM_PROVIDER` environment variable selecting Claude Haiku or OpenRouter).

## Tasks

**Parallel tasks 1-14:**

1. Use backend-developer subagent to add Qdrant service to @docker-compose.yml with `qdrant/qdrant` image, port 6333, persistent volume `qdrant_data`, and add `QDRANT_HOST`, `QDRANT_PORT`, `GOOGLE_API_KEY` environment variables to the api service. Add Qdrant and Google API key settings to @api/core/config.py.
2. Use backend-developer subagent to add `google-generativeai` and `qdrant-client` dependencies to @langraph/pyproject.toml. Add `google-generativeai` and `qdrant-client` to @api/pyproject.toml.
3. Use backend-developer subagent to create clause parsing prompt @langraph/prompts/parse_clauses.txt that instructs the LLM to extract individual clauses from document sections and output a list of `{clause_type, heading, content}` as JSON.
4. Use backend-developer subagent to create parse LLM @langraph/models/parse_llm.py following the existing provider pattern in @langraph/models/analyze_llm.py.
5. Use backend-developer subagent to add `document_id: NotRequired[str]` field to `GenerateDocumentState` in @langraph/app/state.py.
6. Use backend-developer subagent to update @langraph/nodes/finalize_node.py to put a `("ready", {"title": ..., "sections": ..., "doc_type": ..., "description": ...})` tuple on the `phase_callback` queue after computing sections, so the endpoint can create the document before the graph completes. The node still emits the `"finalizing"` phase event as before.
7. Use backend-developer subagent to create RAG answer prompt @langraph/prompts/rag_answer.txt that instructs the LLM to synthesize an answer from document excerpts, cite source documents, and indicate when information is insufficient.
8. Use backend-developer subagent to create re-rank prompt @langraph/prompts/rerank.txt that instructs the LLM to re-rank retrieved chunks by relevance to the query and return the top indices.
9. Use backend-developer subagent to create rerank LLM @langraph/models/rerank_llm.py and answer LLM @langraph/models/answer_llm.py following the existing provider pattern in @langraph/models/analyze_llm.py.
10. Use backend-developer subagent to create RAG state @langraph/app/rag_state.py with `RAGState(TypedDict)` containing fields: `query` (str), `retrieved_chunks` (NotRequired[list[dict]]), `reranked_chunks` (NotRequired[list[dict]]), `answer` (NotRequired[str]), `sources` (NotRequired[list[dict]]), `token_callback` (NotRequired[asyncio.Queue]).
11. Use backend-developer subagent to create assistant request schema @api/schemas/assistant.py with `AssistantQueryRequest(query: str)`.
12. Use frontend-developer subagent to add `assistant` translation keys to @web/src/i18n/en.json: `placeholder` ("Ask about your documents..."), `thinking`, `sources`, `noResults`, `error`.
13. Use frontend-developer subagent to create assistant store @web/src/stores/assistant-store.js with state (`query`, `answer`, `sources`, `loading`, `error`, `open`) and actions (`setQuery`, `submitQuery` using `fetchSSE` subscription pattern from @web/src/stores/new-document-store.js, `close`, `clear`). On SSE error, call `useDialogStore.getState().error(data)` following the existing pattern in @web/src/stores/new-document-store.js.
14. Use qa-tester subagent to plan BDD scenarios @web/src/documents/docs/query-documents.feature.

**Sequential task 15 after task 2 completes:**

15. Use backend-developer subagent to create vector store service @langraph/services/vector_store.py and @langraph/services/__init__.py. Use `google.genai.Client` for embeddings and `qdrant_client.QdrantClient` for storage. Reference https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-embedding-2/ and https://qdrant.tech/documentation/embeddings/gemini/ for SDK usage. Implement `init_collection()` to create the `legal_documents` collection if not exists, `upsert_chunks(chunks)` to embed texts with `task_type=RETRIEVAL_DOCUMENT` via `client.models.embed_content()` and upsert to Qdrant with metadata payload, `search(query, top_k)` to embed query with `task_type=RETRIEVAL_QUERY` and return similar chunks with scores, and `delete_by_document(doc_id)` to remove all chunks for a document. Model: `gemini-embedding-2-preview`. _(imports google-generativeai and qdrant-client from task 2)_

**Parallel after task 15 completes:**

16. Use backend-developer subagent to add Qdrant collection initialization by calling `vector_store.init_collection()` in the `lifespan()` function in @api/main.py (after `init_db()`). _(imports vector_store)_
17. Use backend-developer subagent to create retrieve node @langraph/nodes/retrieve_node.py that calls `vector_store.search(query)` to embed the query with `RETRIEVAL_QUERY` and search Qdrant, returning top-10 `retrieved_chunks` with text, metadata, and scores. _(imports vector_store)_

**Sequential task 18 after tasks 3, 4, and 15 complete:**

18. Use backend-developer subagent to create ingest node @langraph/nodes/ingest_node.py. The node takes `sections`, `document_id`, `title`, and `doc_type` from state, uses the parse LLM to extract clause-level chunks from sections, then calls `vector_store.upsert_chunks()` with each chunk's content and metadata (`document_id`, `title`, `type`, `clause_type`, `heading`). _(imports parse_llm from task 4, vector_store from task 15, loads parse_clauses.txt from task 3)_

**Parallel after tasks 7, 8, and 9 complete:**

19. Use backend-developer subagent to create rerank node @langraph/nodes/rerank_node.py that sends retrieved chunks and query to the rerank LLM, returning the top-5 most relevant as `reranked_chunks`. _(imports rerank_llm from task 9, loads rerank.txt from task 8)_
20. Use backend-developer subagent to create answer node @langraph/nodes/answer_node.py that builds a prompt with reranked chunks as context and the user query, streams the LLM response pushing tokens to `token_callback` queue, and deduplicates sources by `document_id`. _(imports answer_llm from task 9, loads rag_answer.txt from task 7)_

**Sequential task 21 after task 18 completes:**

21. Use backend-developer subagent to add the `ingest` node to the generation graph @langraph/app/graph.py with edge flow: `START -> analyze -> structure -> draft -> finalize -> ingest -> END`. _(imports ingest_node)_

**Sequential task 22 after tasks 10, 17, 19, and 20 complete:**

22. Use backend-developer subagent to create RAG graph @langraph/app/rag_graph.py with `build_rag_graph()`: `START -> retrieve -> rerank -> answer -> END`. _(imports rag_state, retrieve_node, rerank_node, answer_node)_

**Sequential task 23 after tasks 5, 6, and 21 complete:**

23. Use backend-developer subagent to modify `_generate_events` in @api/routes/v1/endpoints/documents.py to generate an `ObjectId` before `graph.ainvoke()` and pass it as `document_id` in the graph state. On receiving the `"ready"` tuple from the finalize node, the endpoint creates the `DocumentModel` with the pre-generated ID (via `insert` with `_id` set), builds the PDF, yields the SSE `"complete"` event with `documentId`, and immediately returns from the generator — closing the SSE connection. Remove `await task` so the graph's asyncio task continues independently, allowing the ingest node to run in the background. Update `run_graph()` to log errors directly via `logging.exception()` instead of putting them on the queue, since the endpoint has already returned and nobody consumes the queue after the `"ready"` phase. _(passes document_id in state from task 5, expects ready tuple from task 6, graph includes ingest node from task 21)_

**Sequential tasks 24-25 after tasks 11 and 22 complete:**

24. Use backend-developer subagent to create assistant SSE endpoint @api/routes/v1/endpoints/assistant.py with `POST /api/v1/assistant/query` that runs the RAG graph and streams `token` events (partial text) and `complete` event (sources array with documentId, title, snippet). Follow the SSE pattern in @api/routes/v1/endpoints/documents.py. _(imports rag_graph from task 22 and assistant schema from task 11)_
25. Use backend-developer subagent to register assistant router in @api/routes/v1/router.py. _(imports assistant endpoint)_

**Sequential tasks 26-27 after task 13 completes:**

26. Use frontend-developer subagent to create assistant panel component @web/src/components/assistant-panel.jsx following @docs/query-documents-ui-design.html. Use separate child components for readability: `assistant-panel-loading.jsx` for the loading/thinking state (using shadcn `Skeleton`), `assistant-panel-empty.jsx` for the no-results state. Render streamed answer text and source citations as `Link` components to `/documents/:id`. Show Esc-to-close hint. Dismiss on click-outside or Escape. _(imports assistant-store)_
27. Use frontend-developer subagent to modify @web/src/components/app-shell.jsx to repurpose the search input as an AI prompt input with updated placeholder from `assistant.placeholder`, `onKeyDown` handler for Enter to call `submitQuery`, and render `AssistantPanel` below the input container. Widen `max-w-[280px]` to `max-w-[480px]`. _(imports assistant-store and assistant-panel)_
