As a user, I want the document generation to use a LangGraph AI workflow — analyzing references, structuring the outline, drafting legal prose, and finalizing into a PDF — so that the generated documents are contextually tailored to my references and input rather than hardcoded content.

## Requirements

- `ReferenceModel` stores the uploaded PDF binary in a `pdf_content` field (Optional[bytes]), so it can be passed to the LLM at generation time.
- Replace the mock `_generate_events` implementation in the documents endpoint with a real LangGraph workflow that processes four sequential phases: analyzing, structuring, drafting, finalizing.
- The **analyzing** phase sends the reference PDF files directly to the LLM as multimodal input and extracts key legal concepts, parties, terms, and clauses. It also determines the document title and type from the references and context.
- The **structuring** phase uses an LLM to produce a document outline (sections with headings) based on the analysis and user-provided context.
- The **drafting** phase uses an LLM to generate legal prose for each section, following the outline and grounding content in the reference material.
- The **finalizing** phase uses an LLM to assemble the full document, check consistency, and generate a brief description summarizing the document. The LLM outputs structured JSON with an array of sections, each containing a heading and an array of content blocks (paragraph, bold, italic, list). The finalize prompt includes a JSON schema example to guide the output format. The structured JSON is then rendered into a PDF using `reportlab` and persisted to MongoDB.
- Each phase emits an SSE event to the client via an `asyncio.Queue` callback before the node begins its work, preserving the existing frontend phase progress UX.
- LLM configuration supports two providers via environment variable: `langchain-anthropic` (Claude) and `langchain-openai` (OpenRouter at `https://openrouter.ai/api/v1`). Each phase has its own LLM variable (`analyze_llm`, `structure_llm`, `draft_llm`, `finalize_llm`) allowing independent model selection.
- The `langraph/` package is installed as a local dependency of the API service.
- Prompts are stored as static `.txt` instruction files with no variable interpolation. Each node reads its prompt file and passes it alongside the relevant state fields as separate content blocks in the LLM message.
- The graph state is a `TypedDict` carrying reference PDF bytes (as a list of `bytes`), context, and intermediate outputs through the pipeline. The LLM provider is assumed to support PDF input.

## Tasks

**Parallel tasks 1-6:**

1. Use backend-developer subagent to add `pdf_content: Optional[bytes] = None` field to `ReferenceModel` @api/models/reference.py. Update `POST /v1/references` in @api/routes/v1/endpoints/references.py to store the raw uploaded file bytes in `pdf_content` when creating the reference.
2. Use backend-developer subagent to create `langraph/pyproject.toml` with dependencies: `langgraph`, `langchain-core`, `langchain-anthropic`, `langchain-openai`, `langsmith`, `python-dotenv`. Require Python >=3.12. Add dev dependencies: `langgraph-cli[inmem]`, `pytest`, `pytest-cov`, `pytest-asyncio`. Create `__init__.py` files for the package and all subpackages: `langraph/__init__.py`, `langraph/models/__init__.py`, `langraph/prompts/__init__.py`, `langraph/nodes/__init__.py`, `langraph/app/__init__.py`.
3. Use backend-developer subagent to create static prompt files @langraph/prompts/analyze.txt, @langraph/prompts/structure.txt, @langraph/prompts/draft.txt, @langraph/prompts/finalize.txt. Each file contains only the LLM instruction — no variables. The analyze prompt instructs the LLM to extract key legal concepts, parties, terms, and clauses from the attached PDFs and user context, and respond with structured text. The structure prompt instructs the LLM to produce a document outline with section headings from the provided analysis and context. The draft prompt instructs the LLM to write legal prose for each section from the provided outline and analysis. The finalize prompt instructs the LLM to assemble the full document, check cross-section consistency, and format the final content from the provided draft and title.
4. Use backend-developer subagent to refactor `_build_nda_pdf` in @api/routes/v1/endpoints/documents.py into a general `build_pdf(title, sections)` function that accepts the finalize node's structured JSON (sections with heading and content blocks: paragraph, bold, italic, list) and maps each content block to the corresponding reportlab flowable. Keep the existing styling approach (title, heading, body paragraph styles).
5. Use backend-developer subagent to add LangGraph environment variables to @docker-compose.yml for the api service: `LANGGRAPH_LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`. Update @.env.example with the new variables.
6. Use qa-tester subagent to plan BDD scenarios @web/src/documents/docs/generate-document.feature.

**Sequential task 7 after task 1 completes:**

7. Use backend-developer subagent to add legal content templates for all seed references in @api/db/seed.py and generate `pdf_content` for each using the existing `generate_pdf()` helper, matching the pattern used for sample documents.

**Parallel after task 2 completes:**

8. Use backend-developer subagent to create LLM configurations in @langraph/models/analyze_llm.py, @langraph/models/structure_llm.py, @langraph/models/draft_llm.py, @langraph/models/finalize_llm.py. Each file reads `LANGGRAPH_LLM_PROVIDER` env var (default `"anthropic"`). When `"anthropic"`, instantiate `ChatAnthropic`. When `"openrouter"`, instantiate `ChatOpenAI` with `base_url="https://openrouter.ai/api/v1"` and `OPENROUTER_API_KEY` env var. Use `temperature=0` for all. Each file exports a single variable (e.g. `analyze_llm`).
9. Use backend-developer subagent to create the prompt loader @langraph/prompts/loader.py. Implement `load_prompt(name)` that reads `{name}.txt` from the prompts directory and returns the text content. No interpolation — prompts are static instructions.
10. Use backend-developer subagent to create graph state @langraph/app/state.py. Define `GenerateDocumentState(TypedDict)` with fields: `references` (list[bytes], raw PDF bytes for each reference document), `context` (str, user input), `title` (NotRequired[str]), `doc_type` (NotRequired[str]), `analysis` (NotRequired[str]), `outline` (NotRequired[str]), `draft` (NotRequired[str]), `sections` (NotRequired[list[dict]], structured JSON output from finalize), `description` (NotRequired[str]), `phase_callback` (NotRequired, asyncio.Queue for emitting SSE phase events).

**Sequential task 11 after tasks 2, 5 complete:**

11. Use backend-developer subagent to add `langraph` as a local dependency in @api/pyproject.toml (e.g. `langraph = {path = "../langraph"}`). Update @api/Dockerfile to copy the `langraph/` package into the container so the local dependency resolves at build time. Add `langraph/` volume mount to the api service in @docker-compose.yml.

**Parallel after tasks 8-9 complete:**

12. Use backend-developer subagent to create analyze node @langraph/nodes/analyze_node.py. Import `analyze_llm` from @langraph/models/analyze_llm.py and `load_prompt` from @langraph/prompts/loader.py. The node function receives state, emits `"analyzing"` phase via `phase_callback` queue, loads the static analyze prompt, builds a multimodal message with the prompt text, each reference's PDF bytes as base64-encoded `application/pdf` content blocks, and `state["context"]` as a text block, invokes the LLM using `with_structured_output` to parse the response into a typed result with `analysis`, `title`, and `doc_type` fields, and returns `{"analysis": result.analysis, "title": result.title, "doc_type": result.doc_type}`.
13. Use backend-developer subagent to create structure node @langraph/nodes/structure_node.py. Import `structure_llm` from @langraph/models/structure_llm.py. The node emits `"structuring"` phase, loads the static structure prompt, builds a message with the prompt, `state["analysis"]`, and `state["context"]` as content blocks, invokes the LLM, returns `{"outline": result}`.
14. Use backend-developer subagent to create draft node @langraph/nodes/draft_node.py. Import `draft_llm` from @langraph/models/draft_llm.py. The node emits `"drafting"` phase, loads the static draft prompt, builds a message with the prompt, `state["outline"]`, and `state["analysis"]` as content blocks, invokes the LLM, returns `{"draft": result}`.
15. Use backend-developer subagent to create finalize node @langraph/nodes/finalize_node.py. Import `finalize_llm` from @langraph/models/finalize_llm.py. The node emits `"finalizing"` phase, loads the static finalize prompt (which includes a JSON schema example for the output format), builds a message with the prompt, `state["draft"]`, and `state["title"]` as content blocks, invokes the LLM to assemble the full document, check consistency, and return structured JSON with sections (each containing a heading and content blocks: paragraph, bold, italic, list). Returns `{"sections": structured_json, "description": summary}`.

**Sequential task 16 after tasks 10, 12-15 complete:**

16. Use backend-developer subagent to create the graph builder @langraph/app/graph.py. Import all four node functions. Build a `StateGraph(GenerateDocumentState)` with linear edges: `START → analyze → structure → draft → finalize → END`. Export `build_graph()` returning the compiled graph.

**Sequential task 17 after tasks 4, 11, 16 complete:**

17. Use backend-developer subagent to replace the mock `_generate_events` in @api/routes/v1/endpoints/documents.py with real LangGraph workflow invocation. Create an `asyncio.Queue` for phase callbacks, build initial state with reference PDF bytes (from `pdf_content`), context, and the queue, run the compiled graph as a background task while yielding SSE phase events from the queue. After the graph completes, call `build_pdf` with the finalized structured JSON, create the `DocumentModel` with the resulting pdf_bytes and page_count, and yield the `complete` event. Remove the simulated delays.
