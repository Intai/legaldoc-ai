Feature: Document Detail Page
  As a user
  I want to view a document's details and its PDF content
  So that I can review the full legal document

  # ──────────────────────────────────────────────
  # Viewing document detail
  # ──────────────────────────────────────────────

  @purge-data
  Scenario: DDP-01 - Display document detail with metadata
    When I navigate to the documents page at "/"
    And I select "Employment" from the type filter dropdown
    And I click a document card "Employee Handbook"
    Then the browser URL should match "/documents/:id"
    And the sidebar should show "Documents" as the active navigation item
    And I should see the document title as an H1 heading
    And I should see a type badge next to the title
    And I should see the creation date in "Created MMM DD, YYYY" format
    And I should see a centered document viewer area
    And the PDF viewer should render all pages of the document
    And the content area should scroll vertically for long documents
    And I should see a sticky action bar at the top of the content area
    And the action bar should display a "Back to Documents" link with an arrow icon
    And the action bar should display an "Export PDF" button
    And the action bar should have a bottom border separator
    When I click the "Export PDF" button
    Then "Employee Handbook.pdf" file should be downloaded via the browser

  # ──────────────────────────────────────────────
  # Loading skeleton state
  # ──────────────────────────────────────────────

  Scenario: DDP-02 - Show loading skeleton while document loads
    When the browser uses "page.waitForTimeout" to delay route "api/v1/documents/*" for "300" seconds
    And I navigate to the documents page at "/"
    And I click a document card "Cookie Policy"
    Then I should see a skeleton placeholder for the document title
    And I should see a skeleton placeholder for the type badge and date
    And I should see a skeleton placeholder for the document viewer area
    And the "Export PDF" button should not be visible
    When the browser network speed is unthrottled
    Then the skeleton placeholders should be replaced by actual content
    And the "Export PDF" button should be enabled
    When I click the "Back to Documents" link
    Then the browser URL should be "/documents"

  # ──────────────────────────────────────────────
  # Error handling - document not found
  # ──────────────────────────────────────────────

  Scenario: DDP-03 - Show error when document is not found
    When I navigate to "/documents/nonexistent-id"
    Then a global error dialog should appear
    And the dialog should display a title and description

  # ──────────────────────────────────────────────
  # Error handling - API failure
  # ──────────────────────────────────────────────

  Scenario: DDP-04 - Show error dialog when document detail API fails
    When I navigate to the documents page at "/"
    And I click a document card "Cookie Policy"
    And I click the "Back to Documents" link
    And the browser network is offline
    And I click a document card "Office Lease Agreement"
    Then a global error dialog should appear
    And the dialog should display a title and description
    And the dialog should include a close button
