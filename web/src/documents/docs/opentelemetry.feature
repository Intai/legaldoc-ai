@signoz
Feature: OpenTelemetry Observability
  As a developer
  I want SigNoz observability with OpenTelemetry
  So that I can monitor distributed traces, browser interactions, and Web Vitals across the full stack

  # ──────────────────────────────────────────────
  # User interaction instrumentation
  # ──────────────────────────────────────────────

  @purge-data @timeout-600s
  Scenario: OT-01 - Capture user input events as spans
    When I navigate to the documents page at "/"
    And I click on the assistant input
    And I type "What clauses should I include in a non-disclosure agreement?" into the assistant input
    And I press "Enter" on the assistant input
    Then the assistant panel should show "No relevant results found. Try rephrasing your question."
    And SigNoz should contain a trace span for "Click: Ask about your docum" with attributes matching regex:
      | service.name   | legaldoc-ai-web |
      | target_test_id | assistant-input |
    And SigNoz should contain a trace span for "Keydown: Enter" with attributes matching regex:
      | service.name   | legaldoc-ai-web |
      | target_test_id | assistant-input |
    And SigNoz should contain a trace span for "HTTP POST" with attributes matching regex:
      | service.name | legaldoc-ai-web                              |
      | http.url     | http://localhost:8000/api/v1/assistant/query |
    And SigNoz should contain a trace span for "POST /api/v1/assistant/query" with attributes matching regex:
      | service.name     | legaldoc-ai-api |
      | http.status_code | 200             |
    And SigNoz should contain a trace span for "langraph.node.retrieve_sparql" with attributes matching regex:
      | service.name       | legaldoc-ai-api |
      | langraph.node.name | retrieve_sparql |
    And SigNoz should contain a trace span for "langraph.node.retrieve_vector" with attributes matching regex:
      | service.name       | legaldoc-ai-api |
      | langraph.node.name | retrieve_vector |
    And SigNoz should contain a trace span for "langraph.node.rerank" with attributes matching regex:
      | service.name       | legaldoc-ai-api |
      | langraph.node.name | rerank          |
    And SigNoz should contain a trace span for "langraph.node.answer" with attributes matching regex:
      | service.name       | legaldoc-ai-api |
      | langraph.node.name | answer          |
    And the following spans should share the same trace ID:
      | Keydown: Enter                |
      | HTTP POST                     |
      | POST /api/v1/assistant/query  |
      | langraph.node.retrieve_sparql |
      | langraph.node.retrieve_vector |
      | langraph.node.rerank          |
      | langraph.node.answer          |

  @purge-data
  Scenario: OT-02 - Capture user click events as spans
    When I navigate to the documents page at "/"
    And I select "Employment" from the type filter dropdown
    Then SigNoz should contain a trace span for "Pointerdown: All Types" with attributes matching regex:
      | service.name   | legaldoc-ai-web    |
      | target_test_id | type-filter-select |
    And SigNoz should contain a trace span for "Pointerdown: Employment" with attributes matching regex:
      | service.name | legaldoc-ai-web |
      | target_slot  | select-item     |
    And SigNoz should contain a trace span for "HTTP GET" with attributes matching regex:
      | service.name | legaldoc-ai-web                                                            |
      | http.url     | http://localhost:8000/api/v1/documents?sort=recent&type=Employment&limit=6 |
    And the following spans should share the same trace ID:
      | Pointerdown: Employment |
      | HTTP GET                |
    When I click a document card header which contains "Employee Handbook"
    Then I should see the document detail header contains "Employee Handbook"
    And SigNoz should contain a trace span for "Click: Employee Handbook" with attributes matching regex:
      | service.name | legaldoc-ai-web |
      | target_slot  | card-header     |
    And SigNoz should contain a trace span for "Navigation: /documents/{id}" with attributes matching regex:
      | service.name | legaldoc-ai-web |
      | target_slot  | card-header     |
    And SigNoz should contain a trace span for "GET /api/v1/documents/{id}" with attributes matching regex:
      | service.name     | legaldoc-ai-api |
      | http.status_code | 200             |
    And SigNoz should contain a trace span for "GET /api/v1/documents/{id}/pdf" with attributes matching regex:
      | service.name     | legaldoc-ai-api |
      | http.status_code | 200             |
    And SigNoz should contain a trace span for "legaldoc.find" with attributes matching regex:
      | service.name          | legaldoc-ai-api |
      | db.name               | legaldoc        |
      | db.mongodb.collection | documents       |
      | db.statement          | find            |
    And the following spans should share the same trace ID:
      | Click: Employee Handbook       |
      | Navigation: /documents/{id}    |
      | GET /api/v1/documents/{id}     |
      | GET /api/v1/documents/{id}/pdf |
      | legaldoc.find                  |

  # ──────────────────────────────────────────────
  # Web Vitals reporting
  # ──────────────────────────────────────────────

  @purge-data
  Scenario: OT-03 - Report LCP Web Vital as a trace span
    When I navigate to the documents page at "/"
    And I click a document card header which contains "Employee Handbook"
    Then I should see the document detail header contains "Employee Handbook"
    When I wait for "5" seconds
    And I navigate to the documents page at "/"
    Then SigNoz should contain a trace span for "web-vital.LCP" with attributes matching regex:
      | service.name              | legaldoc-ai-web |
      | web_vital.navigation_type | navigate        |
      | web_vital.rating          | good            |
    And the span should include a numeric "web_vital.value" attribute
    And SigNoz should contain a trace span for "web-vital.CLS" with attributes matching regex:
      | service.name              | legaldoc-ai-web |
      | web_vital.navigation_type | navigate        |
      | web_vital.rating          | good            |
    And the span should include a numeric "web_vital.value" attribute
    And SigNoz should contain a trace span for "web-vital.FCP" with attributes matching regex:
      | service.name              | legaldoc-ai-web |
      | web_vital.navigation_type | navigate        |
      | web_vital.rating          | good            |
    And the span should include a numeric "web_vital.value" attribute
    And SigNoz should contain a trace span for "web-vital.TTFB" with attributes matching regex:
      | service.name              | legaldoc-ai-web |
      | web_vital.navigation_type | navigate        |
      | web_vital.rating          | good            |
    And the span should include a numeric "web_vital.value" attribute
    And SigNoz should contain a trace span for "web-vital.INP" with attributes matching regex:
      | service.name              | legaldoc-ai-web |
      | web_vital.navigation_type | navigate        |
      | web_vital.rating          | good            |
    And the span should include a numeric "web_vital.value" attribute
