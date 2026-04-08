Feature: SPARQL-based EU Regulation Cross-referencing
  As a user
  I want the AI assistant to cross-reference my legal documents against EU regulations
  So that I can identify compliance gaps and understand how my documents relate to authoritative regulatory text

  # ──────────────────────────────────────────────
  # Query with EU regulation reference
  # ──────────────────────────────────────────────

  @purge-data @timeout-600s
  Scenario: RS-01 - Answer references regulation text when query mentions EU regulation
    When I navigate to the new document page at "/documents/new"
    And I select the "NDA Template" reference
    And I click the "Next" button
    And I type "Between TechCorp and DataFlow Inc, 12-month term, covers shared API data" into the context textarea
    And I click the "Generate Document" button
    Then I should be on step 3
    And all four phases should complete with checkmarks
    When I wait until Qdrant is not empty
    And I type "What clauses should I include in a non-disclosure agreement to comply with GDPR right to erasure?" into the assistant input
    And I press "Enter" on the assistant input
    Then the assistant panel should appear below the assistant input
    And the answer text should be displayed in the panel
    And the answer text should reference regulation content or compliance language
    And I should see a "Sources" section below the answer
    And the first source should display a document icon
    And the first source should display the document title

  # ──────────────────────────────────────────────
  # Multiple regulation references
  # ──────────────────────────────────────────────

  @timeout-600s
  Scenario: RS-02 - Answer incorporates multiple regulation references from query
    When I wait until Qdrant is not empty
    And I type "What clauses should I include in a non-disclosure agreement to comply with GDPR right to be forgotten and ePrivacy Article 5?" into the assistant input
    And I press "Enter" on the assistant input
    Then the assistant panel should appear below the assistant input
    And the answer text should be displayed in the panel
    And the answer text should reference regulation content or compliance language
    And I should see a "Sources" section below the answer
