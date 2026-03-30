Feature: Document Generation via LangGraph AI Workflow
  As a user
  I want the document generation to use a LangGraph AI workflow
  So that generated documents are contextually tailored to my references and input

  # ──────────────────────────────────────────────
  # Multiple reference documents
  # ──────────────────────────────────────────────

  @purge-data @timeout-600s
  Scenario: GD-01 - Generate a document from multiple selected references
    When I navigate to the new document page at "/documents/new"
    And I click the upload area and select "web/src/documents/docs/NDA Template.pdf"
    And I select the "NDA Template" reference
    And I select the "Service Agreement" reference
    And I click the "Next" button
    And I type "Create a combined confidentiality and service agreement" into the context textarea
    And I click the "Generate Document" button
    Then I should be on step 3
    And all four phases should complete with checkmarks
    And the PDF viewer should render the generated document

  # ──────────────────────────────────────────────
  # SSE error during generation
  # ──────────────────────────────────────────────

  @purge-data
  Scenario: GD-02 - Show error dialog when generation fails via SSE error event
    When I navigate to the new document page at "/documents/new"
    And the browser intercepts POST "/api/v1/documents/generate" to respond with an SSE error event
    And I select the "NDA Template" reference
    And I click the "Next" button
    And I type "Create an NDA" into the context textarea
    And I click the "Generate Document" button
    Then a global error dialog should appear
    And the dialog should display a title and description
    And the phase progress should reset
    And the "Save" button should be disabled
    And the "Export PDF" button should be disabled
    When I click the close button on the dialog
    Then the dialog should close

  # ──────────────────────────────────────────────
  # Network failure during generation
  # ──────────────────────────────────────────────

  Scenario: GD-03 - Show error dialog when network fails during generation
    When I navigate to the new document page at "/documents/new"
    And I select the "NDA Template" reference
    And I click the "Next" button
    And I type "Create an NDA" into the context textarea
    And the browser network is offline
    And I click the "Generate Document" button
    Then a global error dialog should appear
    When I click the close button on the dialog
    And I click the "Back" button
    Then I should be on step 2
    And I should see the context textarea with the previously entered text
    And the selected references summary should still be visible
