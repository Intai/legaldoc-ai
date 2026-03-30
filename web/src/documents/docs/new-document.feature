Feature: New Document Page
  As a user
  I want to create a new legal document through a guided 3-step flow
  So that I can produce tailored legal documents grounded in my own reference materials

  # ──────────────────────────────────────────────
  # Step indicator and navigation
  # ──────────────────────────────────────────────

  @purge-data
  Scenario: NDP-01 - Display step indicator with initial state
    When I navigate to the new document page at "/documents/new"
    Then the sidebar should show "New Document" as the active navigation item
    And the step indicator should show 3 steps: "Select References", "Provide Context", "Review & Save"
    And step 1 should be in active state
    And steps 2 and 3 should be in upcoming state
    # Step indicator updates on forward navigation
    When I select the first reference
    And I click the "Next" button
    Then step 1 should be in complete state with a checkmark icon
    And step 2 should be in active state
    # Navigate backward using Back button
    When I click the "Back" button
    Then step 1 should be in active state
    And I should see the select references step content
    #  Navigate to completed step by clicking its circle
    When I click the "Next" button again
    And I click the step 1 circle in the step indicator
    Then I should see the select references step content
    And step 1 should be in active state
    # Cannot click upcoming steps
    When I click the step 2 circle in the step indicator
    Then I should still see the select references step content
    And step 1 should remain in active state

  Scenario: NDP-02 - Mobile step indicator hides labels
    Given the browser viewport is 375px
    When I navigate to the new document page at "/documents/new"
    Then the step indicator should show only numbered circles and connectors
    And the step labels should not be visible

  # ──────────────────────────────────────────────
  # Step 1 - Reference search filtering
  # ──────────────────────────────────────────────

  Scenario: NDP-03 - Filter references by search query matching title
    When I navigate to the new document page at "/documents/new"
    And I type "NDA Template" into the search input
    Then only references with "NDA" in their title should be visible
    When I type "confidential" into the search input
    Then only references with "confidential" in their description should be visible
    When I type "nda t" into the search input
    Then references with "NDA" in their title should be visible

  # ──────────────────────────────────────────────
  # Step 1 - Reference type filtering
  # ──────────────────────────────────────────────

  Scenario: NDP-04 - Filter references by type
    When I navigate to the new document page at "/documents/new"
    Then the type filter dropdown should show "All Types"
    When I select "Contract" from the type filter dropdown
    Then only references with type "Contract" should be visible
    When I select "Policy" from the type filter dropdown
    Then only references with type "Policy" should be visible
    When I select "Employment" from the type filter dropdown
    Then only references with type "Employment" should be visible
    When I select "All Types" from the type filter dropdown
    Then all references should be visible

  # ──────────────────────────────────────────────
  # Step 1 - Selecting and deselecting references
  # ──────────────────────────────────────────────

  Scenario: NDP-05 - Select a reference by clicking its checkbox
    When I navigate to the new document page at "/documents/new"
    And I click the checkbox for "NDA Template"
    Then the "NDA Template" row should be selected
    And the selected panel should show "Selected (1)"
    And the selected panel should list "NDA Template" with its type badge
    When I click the checkbox for "NDA Template"
    Then the "NDA Template" row should not be selected
    And the selected panel should show "No references selected"
    When I select the "NDA Template" reference again
    And I click the remove button for "NDA Template" in the selected panel
    Then "NDA Template" should be removed from the selected panel
    And the "NDA Template" checkbox should be unchecked
    When I select "NDA Template" and "Service Agreement"
    Then the selected panel should show "Selected (2)"
    When I deselect "Service Agreement"
    Then the selected panel should show "Selected (1)"

  # ──────────────────────────────────────────────
  # Step 1 - Next button state
  # ──────────────────────────────────────────────

  Scenario: NDP-06 - Next button disabled until reference selected
    When I navigate to the new document page at "/documents/new"
    Then the "Back" button should be disabled
    And the "Next" button should be disabled
    When I select "NDA Template"
    Then the "Next" button should be enabled
    When I deselect "NDA Template"
    Then the "Next" button should be disabled

  # ──────────────────────────────────────────────
  # Step 1 - Mobile selected summary
  # ──────────────────────────────────────────────

  Scenario: NDP-07 - Mobile shows collapsible selected summary instead of panel
    Given the browser viewport is 375px
    When I navigate to the new document page at "/documents/new"
    Then the selected references panel should not be visible
    And the two-column layout should be stacked vertically
    When I select "NDA Template"
    Then I should see a summary bar showing "1 reference selected"

  # ──────────────────────────────────────────────
  # Step 1 - File upload
  # ──────────────────────────────────────────────

  Scenario: NDP-08 - Upload file via click-to-browse
    When I navigate to the new document page at "/documents/new"
    And I click the upload area and select "web/src/documents/docs/NDA Template.pdf"
    Then the uploaded reference should appear in the reference list
    When I drag and drop the same PDF file onto the upload area
    Then the second uploaded reference should appear in the reference list as well
    When I click the upload area again and select "web/src/documents/docs/Empty.docx"
    Then the file should be rejected
    And the reference list should not contain the rejected file

  # ──────────────────────────────────────────────
  # Step 2 - Provide context
  # ──────────────────────────────────────────────

  Scenario: NDP-09 - Display context step with selected references summary
    When I navigate to the new document page at "/documents/new"
    And I select the "NDA Template" reference
    And I click the "Next" button
    Then I should see a summary card showing the selected reference count and titles
    And I should see a label "Describe what you need"
    And I should see a helper text with guidance for the context textarea
    And the "Generate Document" button should be disabled
    When I type "Create an NDA" into the context textarea
    Then the "Generate Document" button should be enabled
    And the textarea should contain the typed text
    When I clear the context textarea
    Then the "Generate Document" button should be disabled

  # ──────────────────────────────────────────────
  # Step 3 - Generation phase progression
  # ──────────────────────────────────────────────

  @timeout-600s
  Scenario: NDP-10 - Generation progresses through phases via SSE
    When I navigate to the new document page at "/documents/new"
    And I select the "NDA Template" reference
    And I click the "Next" button
    And I type "Create an NDA between Company A and Company B" into the context textarea
    And I click the "Generate Document" button
    Then I should be on step 3
    And the "Save" button should be disabled
    And the "Export PDF" button should be disabled
    And I should see the phase progress indicator
    And the "Analyzing references" phase should become active with a spinner
    And the "Analyzing references" phase should complete with a checkmark
    And the "Structuring document" phase should become active
    And the "Structuring document" phase should complete
    And the "Drafting sections" phase should become active
    And the "Drafting sections" phase should complete
    And the "Finalizing" phase should become active
    And the "Finalizing" phase should complete
    And all four phases should show checkmarks
    And the PDF viewer should render the generated document
    When I click the "Export PDF" button
    Then a PDF file should be downloaded via the browser
    When I click the "Save" button
    Then the document status should be updated to "Done"
    And the browser URL should match "/documents/:id"
    And I should see the document detail page
