As a user, I want the AI assistant to cross-reference my legal documents against EU regulations — such as "Does my privacy policy comply with GDPR Article 17?" — so that I can identify compliance gaps and understand how my documents relate to authoritative regulatory text.

## Requirements

- Rename the existing `retrieve` node to `retrieve_vector` to distinguish it from the new SPARQL-based retrieval. Update all references (state field, imports, tests).
- Add a `retrieve_sparql` node that runs in parallel with `retrieve_vector` in the RAG graph. The node uses an LLM to extract regulation names and article numbers from the user query, then queries the EU Publications Office SPARQL endpoint to fetch the relevant regulation text.
- The SPARQL retrieval uses a single combined query that resolves the regulation by title keyword and fetches article text in one round-trip. No hardcoded CELEX IDs — the endpoint resolves them dynamically.
- The `retrieve_sparql` node returns chunks in SPARQL's natural shape (`content`, `celex_id`, `regulation`, `article_number`), not the vector store format. When no regulation references are found in the query, the node returns an empty list.
- The rerank node scores only `vector_chunks` (document clauses). `sparql_chunks` (regulation text) are passed as read-only context to help the LLM better judge which document clauses are most relevant.
- The answer node receives both `reranked_chunks` and `sparql_chunks`, using regulation text as authoritative context when synthesising the response.
- The RAG graph fans out from START to both retrieval nodes in parallel, fans in to rerank (which waits for both), then proceeds to answer.

## Tasks

**Parallel tasks 1-11:**

1. Use backend-developer subagent to rename @langraph/nodes/retrieve_node.py to @langraph/nodes/retrieve_vector_node.py. Rename the function from `retrieve_node` to `retrieve_vector_node`. Update the return key from `retrieved_chunks` to `vector_chunks`. Update the import in @langraph/app/rag_graph.py to reference `retrieve_vector_node`. Rename @langraph/tests/nodes/test_retrieve_node.py to @langraph/tests/nodes/test_retrieve_vector_node.py and update its imports and references.
2. Use backend-developer subagent to update @langraph/app/rag_state.py. Rename `retrieved_chunks` to `vector_chunks`. Add `sparql_chunks: NotRequired[list[dict]]` field.
3. Use backend-developer subagent to add `sparqlwrapper` dependency to @langraph/pyproject.toml.
4. Use backend-developer subagent to create SPARQL store service @langraph/services/sparql_store.py. Wrap the EU Publications Office endpoint (`https://publications.europa.eu/webapi/rdf/sparql`). Implement `search(regulation_name: str, article_numbers: list[str]) -> list[dict]` that sends a single combined SPARQL query filtering by regulation title keyword and article number, returning `{ content, celex_id, regulation, article_number }`.
5. Use backend-developer subagent to create extract regulations prompt @langraph/prompts/extract_regulations.txt that instructs the LLM to extract regulation names and article numbers from the user query. Output: list of `{ regulation, article_numbers }`. Return empty list if no regulations are referenced.
6. Use backend-developer subagent to create extract regulations LLM @langraph/models/extract_regulations_llm.py following the existing provider pattern in @langraph/models/rerank_llm.py.
7. Use backend-developer subagent to update rerank prompt @langraph/prompts/rerank.txt. Replace "The next message contains the user query followed by the retrieved chunks as JSON." with "The next message contains the user query, document chunks as JSON, and optionally regulation text from the EU legislation knowledge graph as additional context. Rerank only the document chunks. Use the regulation text as context to better judge which document chunks are most relevant."
8. Use backend-developer subagent to update @langraph/nodes/rerank_node.py. Read `vector_chunks` instead of `retrieved_chunks`. Pass `sparql_chunks` as a separate `<regulation_context>` content part (read-only context). Indices refer to `vector_chunks` only.
9. Use backend-developer subagent to update answer prompt @langraph/prompts/rag_answer.txt. Replace "The next message contains the document excerpts as JSON, followed by the user query." with "The next message contains document excerpts as JSON, optionally regulation text from the EU legislation knowledge graph, followed by the user query." Update guideline 2 to: "Base your answer on the provided document excerpts and any regulation text. Treat regulation text as authoritative when assessing legal compliance."
10. Use backend-developer subagent to update @langraph/nodes/answer_node.py. Pass `sparql_chunks` as a separate `<regulation_context>` content part between document chunks and the user query.
11. Use qa-tester subagent to plan BDD scenarios @web/src/documents/docs/retrieve-sparql.feature.

**Parallel after tasks 4 and 6 complete:**

12. Use backend-developer subagent to create retrieve SPARQL node @langraph/nodes/retrieve_sparql_node.py. Use the extract regulations LLM to identify regulation references in the query. If none found, return `{ "sparql_chunks": [] }`. Otherwise query `sparql_store.search()` with the regulation name and article numbers. Return `{ "sparql_chunks": results }`.

**Sequential task 13 after tasks 1 and 12 complete:**

13. Use backend-developer subagent to update @langraph/app/rag_graph.py. Import `retrieve_vector_node` and `retrieve_sparql_node`. Register them as `"retrieve_vector"` and `"retrieve_sparql"`. Fan out from START to both nodes in parallel. Fan in both to `rerank`. Continue `rerank → answer → END`.
