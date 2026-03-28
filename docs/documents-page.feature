Feature: Documents Page
  As a user
  I want to see a list of my saved legal documents
  So that I can browse, filter, and access them

  Background:
    Given the database is seeded with 12 sample documents covering all types and statuses

  # ──────────────────────────────────────────────
  # Viewing document list
  # ──────────────────────────────────────────────

  Scenario: Display page title and document cards
    Given I am on the documents page
    Then I should see "Documents" as the page title
    And I should see document cards in a grid layout
    And each card should display a title
    And each card should display a status badge
    And each card should display a 2-line description snippet
    And each card should display a type badge
    And each card should display a date
    And each card should display a page count

  Scenario: Status badges use correct color variants
    Given I am on the documents page
    Then cards with "Done" status should display a success badge
    And cards with "Draft" status should display a warning badge
    And cards with "Generating" status should display a primary badge

  Scenario: Sidebar shows navigation items with Documents active
    Given I am on the documents page
    Then the sidebar should display the "LegalDoc AI" logo
    And the sidebar should show "Documents" as the active navigation item
    And the sidebar should show "New Document" as a navigation item

  Scenario: Topbar shows search input and user avatar
    Given I am on the documents page
    Then the topbar should display a search input
    And the topbar should display a user avatar

  # ──────────────────────────────────────────────
  # Sorting
  # ──────────────────────────────────────────────

  Scenario: Default sort is most recent
    Given I am on the documents page
    Then the sort dropdown should show "Most Recent"
    And documents should be ordered by date descending

  Scenario: Sort documents by A-Z
    Given I am on the documents page
    When I select "A-Z" from the sort dropdown
    Then documents should be ordered alphabetically by title

  Scenario: Switch sort back to most recent
    Given I am on the documents page
    And I have selected "A-Z" from the sort dropdown
    When I select "Most Recent" from the sort dropdown
    Then documents should be ordered by date descending

  # ──────────────────────────────────────────────
  # Filtering by document type
  # ──────────────────────────────────────────────

  Scenario: Default filter shows all types
    Given I am on the documents page
    Then the type filter dropdown should show "All Types"
    And I should see documents of all types

  Scenario: Filter documents by Contract type
    Given I am on the documents page
    When I select "Contract" from the type filter dropdown
    Then I should only see documents with type "Contract"

  Scenario: Filter documents by Policy type
    Given I am on the documents page
    When I select "Policy" from the type filter dropdown
    Then I should only see documents with type "Policy"

  Scenario: Filter documents by Employment type
    Given I am on the documents page
    When I select "Employment" from the type filter dropdown
    Then I should only see documents with type "Employment"

  Scenario: Filter documents by NDA type
    Given I am on the documents page
    When I select "NDA" from the type filter dropdown
    Then I should only see documents with type "NDA"

  Scenario: Reset filter to all types
    Given I am on the documents page
    And I have selected "Contract" from the type filter dropdown
    When I select "All Types" from the type filter dropdown
    Then I should see documents of all types

  # ──────────────────────────────────────────────
  # Responsive sidebar toggle on mobile
  # ──────────────────────────────────────────────

  Scenario: Sidebar is hidden on mobile by default
    Given the viewport is narrower than 768px
    When I navigate to the documents page
    Then the sidebar should not be visible
    And a hamburger menu icon should be visible in the topbar

  Scenario: Open sidebar via hamburger menu on mobile
    Given the viewport is narrower than 768px
    And I am on the documents page
    When I tap the hamburger menu icon
    Then the sidebar should slide in from the left
    And a semi-transparent overlay should cover the content area

  Scenario: Close sidebar by tapping overlay on mobile
    Given the viewport is narrower than 768px
    And I am on the documents page
    And the sidebar is open
    When I tap the overlay
    Then the sidebar should close
    And the overlay should disappear

  Scenario: Mobile layout uses single column card grid
    Given the viewport is narrower than 768px
    And I am on the documents page
    Then the card grid should display in a single column
    And the content area should have 16px padding

  Scenario: Tablet layout uses two column card grid
    Given the viewport is between 768px and 1023px
    And I am on the documents page
    Then the card grid should display in two columns

  # ──────────────────────────────────────────────
  # Card hover state
  # ──────────────────────────────────────────────

  Scenario: Card shows hover state on mouse over
    Given I am on the documents page
    When I hover over a document card
    Then the card should display a medium shadow
    And the card should display a stronger border

  # ──────────────────────────────────────────────
  # Navigating to document detail
  # ──────────────────────────────────────────────

  Scenario: Click a card to navigate to document detail
    Given I am on the documents page
    When I click on a document card
    Then I should be navigated to the document detail page for that document

  # ──────────────────────────────────────────────
  # Loading skeleton state
  # ──────────────────────────────────────────────

  Scenario: Show skeleton cards while loading
    Given documents are being fetched from the API
    When I navigate to the documents page
    Then I should see 6 skeleton cards with animated pulse effect
    And each skeleton card should mirror the card anatomy with placeholder blocks
    And the sort dropdown should be visible but disabled
    And the type filter dropdown should be visible but disabled

  Scenario: Skeleton cards are replaced by real cards after loading
    Given documents are being fetched from the API
    When I navigate to the documents page
    And the API response is received
    Then the skeleton cards should be replaced by actual document cards
    And the sort dropdown should be enabled
    And the type filter dropdown should be enabled

  # ──────────────────────────────────────────────
  # Empty state - no documents
  # ──────────────────────────────────────────────

  Scenario: Show empty state when no documents exist
    Given no documents exist in the database
    When I navigate to the documents page
    Then I should see the message "No documents yet."
    And I should see the description "Create your first document to get started."
    And I should see a "New Document" CTA button

  Scenario: New Document CTA navigates to new document flow
    Given no documents exist in the database
    And I am on the documents page
    When I click the "New Document" CTA button
    Then I should be navigated to the new document flow

  # ──────────────────────────────────────────────
  # Empty state - filter returns no results
  # ──────────────────────────────────────────────

  Scenario: Show filter-empty state when no documents match the selected filter
    Given I am on the documents page
    When I select a type filter that matches no documents
    Then I should see the message "No documents match your filters."
    And I should see the description "Try adjusting your filters."
    And I should not see a CTA button

  # ──────────────────────────────────────────────
  # Load more pagination
  # ──────────────────────────────────────────────

  Scenario: Show load more button when more pages are available
    Given I am on the documents page
    And there are more documents to load
    Then I should see a "Load more" button centered below the card grid

  Scenario: Load more button fetches next page of results
    Given I am on the documents page
    And there are more documents to load
    When I click the "Load more" button
    Then additional document cards should be appended to the grid

  Scenario: Load more button shows spinner while fetching
    Given I am on the documents page
    And there are more documents to load
    When I click the "Load more" button
    Then the button label should change to a spinner
    And the button should be disabled

  Scenario: Load more button is hidden when all documents are loaded
    Given I am on the documents page
    And all documents have been loaded
    Then the "Load more" button should not be visible

  # ──────────────────────────────────────────────
  # Global error dialog on API failure
  # ──────────────────────────────────────────────

  Scenario: Show error dialog when document list API fails
    Given the documents API returns an error response
    When I navigate to the documents page
    Then a global error dialog should appear
    And the dialog should display a title and description
    And the dialog should include a close button

  Scenario: Close error dialog clears the error state
    Given a global error dialog is displayed
    When I click the close button on the dialog
    Then the dialog should close
    And the error state should be cleared

  Scenario: Show error dialog when load more API fails
    Given I am on the documents page
    And there are more documents to load
    And the documents API returns an error response for the next page
    When I click the "Load more" button
    Then a global error dialog should appear
    And the previously loaded document cards should remain visible
