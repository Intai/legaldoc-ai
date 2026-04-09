Feature: Confirm Draft Document
  As a user
  I want to confirm a draft document
  So that its status changes from "Draft" to "Done"

  # ──────────────────────────────────────────────
  # Confirm draft button visibility
  # ──────────────────────────────────────────────

  @purge-data
  Scenario: CD-01 - Show "Confirm Draft" button only for documents with Draft status
    When I navigate to the documents page at "/"
    And I click a "Draft" document status badge
    Then the browser URL should match "/documents/:id"
    And the action bar should display a "Confirm Draft" button
    And the "Confirm Draft" button should be enabled
    When I click the "Back to Documents" link
    And I click a "Done" document status badge
    Then the action bar should not display a "Confirm Draft" button
    And the action bar should display an "Export PDF" button

  # ──────────────────────────────────────────────
  # Responsive layout with both buttons
  # ──────────────────────────────────────────────

  Scenario: CD-02 - Hide export button label on mobile when both buttons are rendered
    Given the browser viewport is 375px
    When I navigate to the documents page at "/"
    And I click a "Draft" document status badge
    Then the action bar should display a "Confirm Draft" button with visible label
    And the "Export PDF" button should show only the icon without label text

  # ──────────────────────────────────────────────
  # API failure on confirm
  # ──────────────────────────────────────────────

  Scenario: CD-03 - Show error dialog when confirm draft API fails
    When I navigate to the documents page at "/"
    And I click a "Draft" document status badge
    Then the action bar should display a "Confirm Draft" button
    When the browser network is offline
    And I click the "Confirm Draft" button
    Then a global error dialog should appear
    And the dialog should display a title and description
    When I click the close button on the dialog
    Then the "Confirm Draft" button should be enabled

  # ──────────────────────────────────────────────
  # Successful confirm draft
  # ──────────────────────────────────────────────

  Scenario: CD-04 - Confirm a draft document and update status to Done
    When I navigate to the documents page at "/"
    And I click a "Draft" document status badge
    And I click the "Confirm Draft" button
    Then the "Confirm Draft" button should no longer be visible
    And the "Export PDF" button should be visible
    When I click the "Back to Documents" link
    Then the confirmed document card should show "Done" status

  # ──────────────────────────────────────────────
  # Button disabled while saving
  # ──────────────────────────────────────────────

  @purge-data
  Scenario: CD-05 - Disable "Confirm Draft" button while save request is in progress
    When I navigate to the documents page at "/"
    And I click a "Draft" document status badge
    And the browser uses "page.waitForTimeout" to delay route "api/v1/documents/*/status" for "300" seconds
    And I click the "Confirm Draft" button
    Then the "Confirm Draft" button should be disabled
    When the browser "page.unrouteAll" ignoring errors
    Then the "Confirm Draft" button should no longer be visible
