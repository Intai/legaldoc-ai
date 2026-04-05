Feature: Query Documents via AI Assistant
  As a user
  I want to ask natural language questions about my legal documents via the assistant input
  So that I can quickly find and understand relevant clauses, wording, and patterns across all my saved documents

  # ──────────────────────────────────────────────
  # Search input and submission
  # ──────────────────────────────────────────────

  @purge-data
  Scenario: QD-01 - Submit a query by pressing Enter
    When the browser uses "page.waitForTimeout" to delay route "api/v1/assistant/query" for "300" seconds
    And I navigate to the documents page at "/"
    Then the topbar should display an assistant input with the Search icon
    And the assistant input placeholder should be "Ask about your documents..."
    And the assistant panel should not be visible
    When I press "Enter" on the assistant input without typing anything
    Then the assistant panel should not be visible
    When I type "What clauses should I include in an NDA?" into the assistant input
    And I press "Enter" on the assistant input
    Then the assistant panel should appear below the assistant input
    And the assistant panel should show a loading state
    When I press "Escape"
    Then the assistant panel should not be visible
    And the assistant input should retain the query text
    And the browser "page.unrouteAll" ignoring errors

  # ──────────────────────────────────────────────
  # Streamed answer with sources
  # ──────────────────────────────────────────────

  @timeout-600s
  Scenario: QD-02 - Display streamed answer text and source citations
    When I navigate to the new document page at "/documents/new"
    And I select the "NDA Template" reference
    And I click the "Next" button
    And I type "Create an NDA" into the context textarea
    And I click the "Generate Document" button
    Then I should be on step 3
    And all four phases should complete with checkmarks
    When I wait until Qdrant is not empty
    And I type "What clauses should I include in a non-disclosure agreement?" into the assistant input
    And I press "Enter" on the assistant input
    Then the assistant panel should appear below the assistant input
    And the answer text should be displayed in the panel
    And I should see a "Sources" section below the answer
    And each source should display a document icon, title, and snippet
    And each source should be a clickable link
    And I should see an Esc-to-close hint at the bottom of the panel
    When I click the first source citation link
    Then the browser URL should match "/documents/.+"
    And I should see the document detail page

  # ──────────────────────────────────────────────
  # No results state
  # ──────────────────────────────────────────────

  Scenario: QD-03 - Show no-results state when query has no relevant documents
    When the browser intercepts POST "/api/v1/assistant/query" to respond with an SSE complete event with empty answer and sources
    And I navigate to the documents page at "/"
    And I type "What is the weather in Tokyo?" into the assistant input
    And I press "Enter" on the assistant input
    Then the assistant panel should show "No relevant results found. Try rephrasing your question."
    And I should see an Esc-to-close hint at the bottom of the panel
    When I click outside the assistant panel on the page content area
    Then the assistant panel should not be visible

  # ──────────────────────────────────────────────
  # Error handling
  # ──────────────────────────────────────────────

  Scenario: QD-04 - Show error dialog when assistant query fails via SSE error event
    When I navigate to the documents page at "/"
    And the browser intercepts POST "/api/v1/assistant/query" to respond with an SSE error event
    And I type "What clauses do we use for termination?" into the assistant input
    And I press "Enter" on the assistant input
    Then a global error dialog should appear
    And the dialog should display a title and description
    When I click the close button on the dialog
    Then the dialog should close
    And the assistant panel should not be visible

  Scenario: QD-05 - Show error dialog when network fails during assistant query
    When I navigate to the documents page at "/"
    And I press "Tab" until focus reaches the assistant input
    And I type "What clauses do we use for termination?" into the assistant input
    And the browser network is offline
    And I press "Enter" on the assistant input
    Then a global error dialog should appear
    And the assistant panel should not be visible
