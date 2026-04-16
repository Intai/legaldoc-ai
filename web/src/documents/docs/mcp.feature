@mcp
Feature: MCP Server Tools
  As a developer
  I want an MCP server mounted on the FastAPI app at /mcp
  So that AI clients like Claude Code can interact with the LegalDoc AI system via Streamable HTTP transport

  # ──────────────────────────────────────────────
  # mcp_list_references
  # ──────────────────────────────────────────────

  @purge-data
  Scenario: MCP-01 - List all reference documents without filter
    When I prompt Claude Code "Show me all legal reference documents" with legaldoc mcp
    Then the MCP tool "mcp_list_references" should be used
    And the response should be a list of reference documents
    And each reference should contain "id", "title", "type", "description", "createdAt"
    And the references should be sorted by createdAt descending

  Scenario: MCP-02 - List reference documents filtered by type
    When I prompt Claude Code "List all Contract reference documents" with legaldoc mcp
    Then the MCP tool "mcp_list_references" should be used
    And every returned reference should have type "Contract"

  Scenario: MCP-03 - List references with a type that has no matches
    When I prompt Claude Code "Do we have any NDA reference documents on file?" with legaldoc mcp
    Then the MCP tool "mcp_list_references" should be used
    And the response should be an empty list

  # ──────────────────────────────────────────────
  # mcp_list_documents
  # ──────────────────────────────────────────────

  Scenario: MCP-04 - List documents with default pagination
    When I prompt Claude Code "What documents do we have in the system?" with legaldoc mcp
    Then the MCP tool "mcp_list_documents" should be used
    And the response should contain a list of "documents"
    And each document should contain "id", "title", "type", "status", "description", "createdAt", "pageCount", "pdfUrl"
    And each "pdfUrl" should match the pattern "/api/v1/documents/{id}/pdf"
    And the response should contain a "nextCursor" field

  Scenario: MCP-05 - List documents sorted by recent
    When I prompt Claude Code "Show me the most recently created documents first" with legaldoc mcp
    Then the MCP tool "mcp_list_documents" should be used
    And documents should be ordered by createdAt descending

  Scenario: MCP-06 - List documents sorted alphabetically
    When I prompt Claude Code "Can you list our documents in alphabetical order?" with legaldoc mcp
    Then the MCP tool "mcp_list_documents" should be used
    And documents should be ordered alphabetically by title ascending

  Scenario: MCP-07 - List documents filtered by type
    When I prompt Claude Code "Pull up all the Employment documents" with legaldoc mcp
    Then the MCP tool "mcp_list_documents" should be used
    And every returned document should have type "Employment"

  Scenario: MCP-08 - Paginate documents using cursor
    When I prompt Claude Code "Give me a short list of just 2 documents" with legaldoc mcp
    Then the MCP tool "mcp_list_documents" should be used
    And the response should contain at most 2 documents
    And "nextCursor" should not be null when more documents exist
    When I prompt Claude Code "Show me the next page of documents" with legaldoc mcp
    Then the MCP tool "mcp_list_documents" should be used
    And the response should contain the next page of documents
    And no document from the first page should appear in the second page

  Scenario: MCP-09 - List documents with invalid cursor
    When I prompt Claude Code "Continue listing documents from cursor invalid-cursor-value" with legaldoc mcp
    Then the MCP tool "mcp_list_documents" should be used
    And the tool should raise an error indicating an invalid cursor

  # ──────────────────────────────────────────────
  # mcp_update_document_status
  # ──────────────────────────────────────────────

  Scenario: MCP-10 - Update document status from Draft to Done
    When I prompt Claude Code "Find a document with status Draft" with legaldoc mcp
    Then the MCP tool "mcp_list_documents" should be used
    When I prompt Claude Code "This document '{id}' looks good, mark it as Done" with legaldoc mcp
    Then the MCP tool "mcp_update_document_status" should be used
    And the response should contain the updated document with status "Done"
    When I prompt Claude Code "Actually, move document '{id}' back to Draft, it needs more work" with legaldoc mcp
    Then the MCP tool "mcp_update_document_status" should be used
    And the response should contain the updated document with status "Draft"

  Scenario: MCP-11 - Update status with non-existent document ID
    When I prompt Claude Code "Mark document 000000000000000000000000 as Done" with legaldoc mcp
    Then the MCP tool "mcp_update_document_status" should be used
    And the tool should raise an error indicating the document was not found

  Scenario: MCP-12 - Update status with invalid document ID format
    When I prompt Claude Code "Update the status of document not-a-valid-id to Done" with legaldoc mcp
    Then the MCP tool "mcp_update_document_status" should be used
    And the tool should raise an error indicating an invalid document ID

  # ──────────────────────────────────────────────
  # mcp_generate_document
  # ──────────────────────────────────────────────

  @timeout-600s
  Scenario: MCP-13 - Generate a document from references and context
    When I prompt Claude Code "Find a reference document with title 'NDA Template'" with legaldoc mcp
    Then the MCP tool "mcp_list_references" should be used
    When I prompt Claude Code "Draft a data sharing agreement between TechCorp and DataFlow Inc for a 12-month term covering shared API data, based on reference '{id}'" with legaldoc mcp
    Then the MCP tool "mcp_generate_document" should be used
    Then the response should contain a "documentId" string
    And the generated document should exist in the system with status "Draft"

  @timeout-600s
  Scenario: MCP-14 - Generate document with non-existent reference IDs
    When I prompt Claude Code "Generate a contract using reference 000000000000000000000000 for a basic consulting deal" with legaldoc mcp
    Then the MCP tool "mcp_generate_document" should be used
    And the tool should raise an error indicating no valid references were found

  @timeout-600s
  Scenario: MCP-15 - Generate document with empty reference IDs
    When I prompt Claude Code "Create a legal document about a consulting arrangement without using any references" with legaldoc mcp
    Then the MCP tool "mcp_generate_document" should be used
    And the tool should raise an error indicating no valid references were found

  # ──────────────────────────────────────────────
  # mcp_query_assistant
  # ──────────────────────────────────────────────

  @timeout-600s
  Scenario: MCP-16 - Query assistant returns answer and sources
    When I prompt Claude Code "Using legal document assistant, what are the prohibited use of shared API data between TechCorp and DataFlow Inc?" with legaldoc mcp
    Then the MCP tool "mcp_query_assistant" should be used
    And the response should contain an "answer" string that is not empty
    And the response should contain a "sources" list
    And each source should contain "documentId", "title", "snippet"

  Scenario: MCP-17 - Query assistant with no relevant results
    When I prompt Claude Code "Using legal document assistant, what is the weather in Tokyo?" with legaldoc mcp
    Then the MCP tool "mcp_query_assistant" should not be used

  # ──────────────────────────────────────────────
  # MCP transport and connectivity
  # ──────────────────────────────────────────────

  Scenario: MCP-18 - MCP server lists all five registered tools
    When the MCP client sends a "tools/list" request
    Then the response should contain exactly 5 tools
    And the tool names should be "mcp_list_references", "mcp_list_documents", "mcp_update_document_status", "mcp_query_assistant", "mcp_generate_document"
