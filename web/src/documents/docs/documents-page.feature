Feature: Documents Page
  As a user
  I want to see a list of my saved legal documents
  So that I can browse, filter, and access them

  # ──────────────────────────────────────────────
  # Viewing document list
  # ──────────────────────────────────────────────

  @purge-data
  Scenario: DP-01 - Display page title and document cards
    Given I am on the documents page
    Then the topbar should display an assistant input
    And the topbar should display a user avatar
    And the sidebar should show "Documents" as the active navigation item
    And the sidebar should show "New Document" as a navigation item
    And I should see "Documents" as the page title
    And I should see document cards in a grid layout
    And each card should display a title
    And each card should display a status badge
    And each card should display a maximum 2-line description snippet
    And each card should display a type badge
    And each card should display a date
    And each card should display a page count
    And cards with "Done" status should display a success badge
    And cards with "Draft" status should display a warning badge
    And cards with "Generating" status should display a primary badge

  # ──────────────────────────────────────────────
  # Sorting
  # ──────────────────────────────────────────────

  Scenario: DP-02 - Default sort is most recent
    Given I am on the documents page
    Then the sort dropdown should show "Most Recent"
    And documents should be ordered by date descending
    When I select "A-Z" from the sort dropdown
    Then documents should be ordered alphabetically by title
    When I select "Most Recent" from the sort dropdown
    Then documents should be ordered by date descending

  # ──────────────────────────────────────────────
  # Filtering by document type
  # ──────────────────────────────────────────────

  Scenario: DP-03 - Default filter shows all types
    Given the browser viewport is 768px
    When I navigate to the documents page at "/"
    Then the card grid should display in two columns
    And the type filter dropdown should show "All Types"
    And I should see documents of all types
    When I select "Contract" from the type filter dropdown
    Then I should only see documents with type "Contract"
    When I select "Policy" from the type filter dropdown
    Then I should only see documents with type "Policy"
    When I select "Employment" from the type filter dropdown
    Then I should only see documents with type "Employment"
    When I select "NDA" from the type filter dropdown
    Then I should only see documents with type "NDA"
    When I select "All Types" from the type filter dropdown
    Then I should see documents of all types

  # ──────────────────────────────────────────────
  # Responsive sidebar toggle on mobile
  # ──────────────────────────────────────────────

  Scenario: DP-04 - Sidebar is hidden on mobile by default
    Given the browser viewport is 375px
    When I navigate to the documents page at "/"
    Then the sidebar should not be visible
    And a lucide panel-left icon should be visible in the topbar
    And the card grid should display in a single column
    When I tap the lucide panel-left icon
    Then the sidebar should slide in from the left
    And a semi-transparent overlay should cover the content area
    When I tap the overlay
    Then the sidebar should close
    And the overlay should disappear

  # ──────────────────────────────────────────────
  # Loading skeleton state
  # ──────────────────────────────────────────────

  Scenario: DP-05 - Show skeleton cards while loading
    Given the browser uses "page.waitForTimeout" to delay route "api/v1/documents" for "300" seconds
    When I navigate to the documents page at "/"
    Then I should see 6 skeleton cards with animated pulse effect
    And the sort dropdown should be visible but disabled
    And the type filter dropdown should be visible but disabled
    When the browser network speed is unthrottled
    And I wait for 300 milliseconds
    Then the skeleton cards should be replaced by actual document cards
    And the sort dropdown should be enabled
    And the type filter dropdown should be enabled

  # ──────────────────────────────────────────────
  # Empty state - no documents
  # ──────────────────────────────────────────────

  Scenario: DP-06 - Show empty state when no documents exist
    When I delete all documents in the database
    And I navigate to the documents page at "/"
    Then I should see the message "No documents yet."
    And I should see the description "Create your first document to get started."
    And I should see a "New Document" CTA button
    When I click the "New Document" CTA button
    Then the browser URL should be "/documents/new"

  # ──────────────────────────────────────────────
  # Empty state - filter returns no results
  # ──────────────────────────────────────────────

  @purge-data
  Scenario: DP-07 - Show filter-empty state when no documents match the selected filter
    When I delete all "NDA" documents in the database
    And I navigate to the documents page at "/"
    And I select "NDA" from the type filter dropdown
    Then I should see the message "No documents match your filters."
    And I should see the description "Try adjusting your filters."
    And I should not see a CTA button

  # ──────────────────────────────────────────────
  # Load more pagination
  # ──────────────────────────────────────────────

  Scenario: DP-08 - Show load more button when more pages are available
    When I navigate to the documents page at "/"
    Then I should see a "Load more" button centered below the card grid
    When the browser uses "page.waitForTimeout" to delay route "api/v1/documents" for "300" seconds
    And I click the "Load more" button
    Then the button label should change to a spinner
    And the button should be disabled
    When the browser network speed is unthrottled
    And I wait for 300 milliseconds
    Then additional document cards should be appended to the grid
    And the "Load more" button should not be visible

  # ──────────────────────────────────────────────
  # Global error dialog on API failure
  # ──────────────────────────────────────────────

  Scenario: DP-09 - Show error dialog when document list API fails
    When I navigate to the documents page at "/"
    Then I should see the sort dropdown
    When the browser network is offline
    And I select "A-Z" from the sort dropdown
    Then a global error dialog should appear
    And the dialog should display a title and description
    And the dialog should include a close button
    When I click the close button on the dialog
    Then the dialog should close

  Scenario: DP-10 - Show error dialog when load more API fails
    When I navigate to the documents page at "/"
    Then I should see a "Load more" button
    When the browser network is offline
    And I click the "Load more" button
    Then a global error dialog should appear
    When I click the close button on the dialog
    Then the previously loaded document cards should remain visible

  # ──────────────────────────────────────────────
  # Keyboard support
  # ──────────────────────────────────────────────

  Scenario: DP-11 - Navigate and activate controls using keyboard
    When I am on the documents page
    Then I should see the sort dropdown enabled
    When I press "Tab" to move focus forward
    Then focus should move to the sort dropdown
    When I press "Enter" on the sort dropdown
    Then the sort dropdown options should be visible
    When I press "ArrowDown" to highlight "A-Z"
    And I press "Enter" to select "A-Z"
    Then the sort dropdown should show "A-Z"
    And documents should be ordered alphabetically by title
    And I should see the type filter dropdown enabled
    When I press "Tab" to move focus forward
    Then focus should move to the type filter dropdown
    When I press "Space" on the type filter dropdown
    Then the type filter dropdown options should be visible
    When I press "ArrowDown" to highlight "Contract"
    And I press "Enter" to select "Contract"
    Then the type filter dropdown should show "Contract"
    And I should only see documents with type "Contract"
    And I should see the sort dropdown enabled
    When I press "Tab" until focus reaches the first document card
    And I press "Enter" on the first document card
    Then the browser URL should match "/documents/.+"
    When I navigate back to the documents page
    Then I should see the sort dropdown enabled
    When I press "Tab" until focus reaches the "Load more" button
    And I press "Space" on the "Load more" button
    Then additional document cards should be appended to the grid
    When I press "Shift+Tab" to move focus backward
    Then focus should move to the last document card in the grid
