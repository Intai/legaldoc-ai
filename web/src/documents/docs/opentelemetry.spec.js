import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';

// ============================================================
// Helper Functions
// ============================================================

/**
 * Query SigNoz ClickHouse for a web-vital trace span by name.
 * Returns the raw Vertical-format output string with web_vital attributes.
 */
function querySigNozWebVital(spanName, { extraWhere = '' } = {}) {
  return execSync(
    `docker exec signoz-clickhouse clickhouse-client --database=signoz_traces --query="`
    + `SELECT name, resources_string['service.name'] AS svc, `
    + `attributes_string['web_vital.navigation_type'] AS nav_type, `
    + `attributes_string['web_vital.rating'] AS rating, `
    + `attributes_number['web_vital.value'] AS value `
    + `FROM distributed_signoz_index_v3 `
    + `WHERE timestamp >= toDateTime64(now() - interval 5 minute, 9) `
    + `AND name = '${spanName}'${extraWhere} LIMIT 1 FORMAT Vertical"`,
    { encoding: 'utf-8' },
  );
}

/**
 * Query SigNoz ClickHouse for a trace span by name.
 * Returns the raw Vertical-format output string.
 */
function querySigNozSpan(spanName, { extraWhere = '', likeMatch = false } = {}) {
  const nameCondition = likeMatch
    ? `name LIKE '${spanName}%'`
    : `name = '${spanName}'`;
  return execSync(
    `docker exec signoz-clickhouse clickhouse-client --database=signoz_traces --query="`
    + `SELECT name, traceID, resources_string['service.name'] AS svc, `
    + `attributes_string['target_test_id'] AS target_test_id, `
    + `attributes_string['target_slot'] AS target_slot, `
    + `attributes_string['http.url'] AS http_url, `
    + `attributes_number['http.status_code'] AS http_status, `
    + `attributes_string['langraph.node.name'] AS node_name, `
    + `attributes_string['db.name'] AS db_name, `
    + `attributes_string['db.mongodb.collection'] AS db_collection, `
    + `attributes_string['db.statement'] AS db_statement `
    + `FROM distributed_signoz_index_v3 `
    + `WHERE timestamp >= toDateTime64(now() - interval 5 minute, 9) `
    + `AND ${nameCondition}${extraWhere} LIMIT 1 FORMAT Vertical"`,
    { encoding: 'utf-8' },
  );
}

/**
 * Extract the traceID for a specific span name from SigNoz ClickHouse.
 * Returns the traceID string.
 */
function queryTraceIdForSpan(spanName, { extraWhere = '', likeMatch = false } = {}) {
  const nameCondition = likeMatch
    ? `name LIKE '${spanName}%'`
    : `name = '${spanName}'`;
  const output = execSync(
    `docker exec signoz-clickhouse clickhouse-client --database=signoz_traces --query="`
    + `SELECT traceID `
    + `FROM distributed_signoz_index_v3 `
    + `WHERE timestamp >= toDateTime64(now() - interval 5 minute, 9) `
    + `AND ${nameCondition}${extraWhere} LIMIT 1 FORMAT TabSeparated"`,
    { encoding: 'utf-8' },
  );
  return output.trim();
}

/**
 * Count how many distinct span names from the given list appear under a specific traceID.
 */
function querySpanCountByTraceId(traceId, conditions) {
  const whereParts = conditions.map((c) =>
    typeof c === 'string' ? `name = '${c}'` : `name LIKE '${c.like}'`,
  );
  return execSync(
    `docker exec signoz-clickhouse clickhouse-client --database=signoz_traces --query="`
    + `SELECT uniqExact(name) AS span_count `
    + `FROM distributed_signoz_index_v3 `
    + `WHERE timestamp >= toDateTime64(now() - interval 5 minute, 9) `
    + `AND traceID = '${traceId}' `
    + `AND (${whereParts.join(' OR ')}) FORMAT Vertical"`,
    { encoding: 'utf-8' },
  );
}

/**
 * Query SigNoz ClickHouse for trace IDs of multiple span names.
 * Returns the count of unique trace IDs.
 */
function querySharedTraceId(spanNames, { extraWhere = '' } = {}) {
  const nameList = spanNames.map((n) => `'${n}'`).join(', ');
  return execSync(
    `docker exec signoz-clickhouse clickhouse-client --database=signoz_traces --query="`
    + `SELECT uniqExact(traceID) AS unique_traces `
    + `FROM distributed_signoz_index_v3 `
    + `WHERE timestamp >= toDateTime64(now() - interval 5 minute, 9) `
    + `AND name IN (${nameList})${extraWhere} FORMAT Vertical"`,
    { encoding: 'utf-8' },
  );
}

// ============================================================
// Test Suite
// ============================================================

test.describe('Feature: OpenTelemetry Observability', () => {
  test('OT-01: Capture user input events as spans @purge-data @timeout-600s @signoz', async ({ page }) => {
    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');

    // And I click on the assistant input
    await page.getByTestId('topbar').getByTestId('assistant-input').click();

    // And I type "What clauses should I include in a non-disclosure agreement?" into the assistant input
    await page.getByTestId('topbar').getByTestId('assistant-input').fill('What clauses should I include in a non-disclosure agreement?');

    // And I press "Enter" on the assistant input
    await page.keyboard.press('Enter');

    // Then the assistant panel should show "No relevant results found. Try rephrasing your question."
    await expect(page.getByTestId('assistant-panel').getByTestId('assistant-panel-empty')).toContainText(
      'No relevant results found. Try rephrasing your question.',
    );

    // Wait for OTEL batch processor to flush traces
    await page.waitForFunction(() => new Promise((r) => setTimeout(r, 17000)).then(() => true));

    // And SigNoz should contain a trace span for "Click: Ask about your docum" with attributes matching regex:
    // | service.name   | legaldoc-ai-web |
    // | target_test_id | assistant-input |
    const clickSpan = querySigNozSpan('Click: Ask about your docum', { likeMatch: true });
    expect(clickSpan).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(clickSpan).toMatch(/target_test_id:\s+assistant-input/);

    // And SigNoz should contain a trace span for "Keydown: Enter" with attributes matching regex:
    // | service.name   | legaldoc-ai-web |
    // | target_test_id | assistant-input |
    const keydownSpan = querySigNozSpan('Keydown: Enter');
    expect(keydownSpan).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(keydownSpan).toMatch(/target_test_id:\s+assistant-input/);

    // And SigNoz should contain a trace span for "HTTP POST" with attributes matching regex:
    // | service.name | legaldoc-ai-web                              |
    // | http.url     | http://localhost:8000/api/v1/assistant/query |
    const httpPostSpan = querySigNozSpan('HTTP POST', {
      extraWhere: ` AND attributes_string['http.url'] LIKE '%/assistant/query%'`,
    });
    expect(httpPostSpan).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(httpPostSpan).toMatch(/http_url:\s+http:\/\/localhost:8000\/api\/v1\/assistant\/query/);

    // And SigNoz should contain a trace span for "POST /api/v1/assistant/query" with attributes matching regex:
    // | service.name     | legaldoc-ai-api |
    // | http.status_code | 200             |
    const apiPostSpan = querySigNozSpan('POST /api/v1/assistant/query');
    expect(apiPostSpan).toMatch(/svc:\s+legaldoc-ai-api/);
    expect(apiPostSpan).toMatch(/http_status:\s+200/);

    // And SigNoz should contain a trace span for "langraph.node.retrieve_sparql" with attributes matching regex:
    // | service.name       | legaldoc-ai-api |
    // | langraph.node.name | retrieve_sparql |
    const sparqlSpan = querySigNozSpan('langraph.node.retrieve_sparql');
    expect(sparqlSpan).toMatch(/svc:\s+legaldoc-ai-api/);
    expect(sparqlSpan).toMatch(/node_name:\s+retrieve_sparql/);

    // And SigNoz should contain a trace span for "langraph.node.retrieve_vector" with attributes matching regex:
    // | service.name       | legaldoc-ai-api |
    // | langraph.node.name | retrieve_vector |
    const vectorSpan = querySigNozSpan('langraph.node.retrieve_vector');
    expect(vectorSpan).toMatch(/svc:\s+legaldoc-ai-api/);
    expect(vectorSpan).toMatch(/node_name:\s+retrieve_vector/);

    // And SigNoz should contain a trace span for "langraph.node.rerank" with attributes matching regex:
    // | service.name       | legaldoc-ai-api |
    // | langraph.node.name | rerank          |
    const rerankSpan = querySigNozSpan('langraph.node.rerank');
    expect(rerankSpan).toMatch(/svc:\s+legaldoc-ai-api/);
    expect(rerankSpan).toMatch(/node_name:\s+rerank/);

    // And SigNoz should contain a trace span for "langraph.node.answer" with attributes matching regex:
    // | service.name       | legaldoc-ai-api |
    // | langraph.node.name | answer          |
    const answerSpan = querySigNozSpan('langraph.node.answer');
    expect(answerSpan).toMatch(/svc:\s+legaldoc-ai-api/);
    expect(answerSpan).toMatch(/node_name:\s+answer/);

    // And the following spans should share the same trace ID:
    // | Keydown: Enter                |
    // | HTTP POST                     |
    // | POST /api/v1/assistant/query  |
    // | langraph.node.retrieve_sparql |
    // | langraph.node.retrieve_vector |
    // | langraph.node.rerank          |
    // | langraph.node.answer          |
    const sharedTrace = querySharedTraceId(
      [
        'Keydown: Enter',
        'HTTP POST',
        'POST /api/v1/assistant/query',
        'langraph.node.retrieve_sparql',
        'langraph.node.retrieve_vector',
        'langraph.node.rerank',
        'langraph.node.answer',
      ],
    );
    expect(sharedTrace).toContain('unique_traces: 1');
  });

  test('OT-02: Capture user click events as spans @purge-data @signoz', async ({ page }) => {
    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');

    // And I select "Employment" from the type filter dropdown
    await page.getByTestId('type-filter-select').click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('option', { name: 'Employment' }).click();
    await page.waitForLoadState('networkidle');

    // Wait for OTEL batch processor to flush traces
    await page.waitForFunction(() => new Promise((r) => setTimeout(r, 17000)).then(() => true));

    // Then SigNoz should contain a trace span for "Pointerdown: All Types" with attributes matching regex:
    // | service.name   | legaldoc-ai-web    |
    // | target_test_id | type-filter-select |
    const pointerdownAllTypes = querySigNozSpan('Pointerdown: All Types', { likeMatch: true });
    expect(pointerdownAllTypes).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(pointerdownAllTypes).toMatch(/target_test_id:\s+type-filter-select/);

    // And SigNoz should contain a trace span for "Pointerdown: Employment" with attributes matching regex:
    // | service.name | legaldoc-ai-web |
    // | target_slot  | select-item     |
    const pointerdownEmployment = querySigNozSpan('Pointerdown: Employment');
    expect(pointerdownEmployment).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(pointerdownEmployment).toMatch(/target_slot:\s+select-item/);

    // And SigNoz should contain a trace span for "HTTP GET" with attributes matching regex:
    // | service.name | legaldoc-ai-web                                                            |
    // | http.url     | http://localhost:8000/api/v1/documents?sort=recent&type=Employment&limit=6 |
    const httpGetSpan = querySigNozSpan('HTTP GET', {
      extraWhere: ` AND attributes_string['http.url'] LIKE '%type=Employment%'`,
    });
    expect(httpGetSpan).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(httpGetSpan).toMatch(/http_url:\s+http:\/\/localhost:8000\/api\/v1\/documents\?sort=recent&type=Employment&limit=6/);

    // And the following spans should share the same trace ID:
    // | Pointerdown: Employment |
    // | HTTP GET                |
    const pointerdownTraceId = queryTraceIdForSpan('Pointerdown: Employment');
    const httpGetTraceId = queryTraceIdForSpan('HTTP GET', {
      extraWhere: ` AND attributes_string['http.url'] LIKE '%type=Employment%'`,
    });
    expect(pointerdownTraceId).toBe(httpGetTraceId);

    // When I click a document card header which contains "Employee Handbook"
    await page.locator('[data-slot="card-header"]').filter({ hasText: 'Employee Handbook' }).click();

    // Then I should see the document detail header contains "Employee Handbook"
    await expect(page.getByRole('heading', { name: 'Employee Handbook', level: 1 })).toBeVisible();

    // Wait for OTEL batch processor to flush traces
    await page.waitForFunction(() => new Promise((r) => setTimeout(r, 17000)).then(() => true));

    // And SigNoz should contain a trace span for "Click: Employee Handbook" with attributes matching regex:
    // | service.name | legaldoc-ai-web |
    // | target_slot  | card-header     |
    const clickSpan = querySigNozSpan('Click: Employee Handbook');
    expect(clickSpan).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(clickSpan).toMatch(/target_slot:\s+card-header/);

    // And SigNoz should contain a trace span for "Navigation: /documents/{id}" with attributes matching regex:
    // | service.name | legaldoc-ai-web |
    // | target_slot  | card-header     |
    const navSpan = querySigNozSpan('Navigation: /documents/', { likeMatch: true });
    expect(navSpan).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(navSpan).toMatch(/target_slot:\s+card-header/);

    // And SigNoz should contain a trace span for "GET /api/v1/documents/{id}" with attributes matching regex:
    // | service.name     | legaldoc-ai-api |
    // | http.status_code | 200             |
    const getDocSpan = querySigNozSpan('GET /api/v1/documents/{id}');
    expect(getDocSpan).toMatch(/svc:\s+legaldoc-ai-api/);
    expect(getDocSpan).toMatch(/http_status:\s+200/);

    // And SigNoz should contain a trace span for "GET /api/v1/documents/{id}/pdf" with attributes matching regex:
    // | service.name     | legaldoc-ai-api |
    // | http.status_code | 200             |
    const getPdfSpan = querySigNozSpan('GET /api/v1/documents/{id}/pdf');
    expect(getPdfSpan).toMatch(/svc:\s+legaldoc-ai-api/);
    expect(getPdfSpan).toMatch(/http_status:\s+200/);

    // And SigNoz should contain a trace span for "legaldoc.find" with attributes matching regex:
    // | service.name          | legaldoc-ai-api |
    // | db.name               | legaldoc        |
    // | db.mongodb.collection | documents       |
    // | db.statement          | find            |
    const findSpan = querySigNozSpan('legaldoc.find');
    expect(findSpan).toMatch(/svc:\s+legaldoc-ai-api/);
    expect(findSpan).toMatch(/db_name:\s+legaldoc/);
    expect(findSpan).toMatch(/db_collection:\s+documents/);
    expect(findSpan).toMatch(/db_statement:\s+find/);

    // And the following spans should share the same trace ID:
    // | Click: Employee Handbook       |
    // | Navigation: /documents/{id}    |
    // | GET /api/v1/documents/{id}     |
    // | GET /api/v1/documents/{id}/pdf |
    // | legaldoc.find                  |
    const clickTraceId = queryTraceIdForSpan('Click: Employee Handbook');
    const navTraceCount = querySpanCountByTraceId(clickTraceId, [
      'Click: Employee Handbook',
      { like: 'Navigation: /documents/%' },
      'GET /api/v1/documents/{id}',
      'GET /api/v1/documents/{id}/pdf',
      'legaldoc.find',
    ]);
    expect(navTraceCount).toContain('span_count: 5');
  });

  test('OT-03: Report LCP Web Vital as a trace span @purge-data @signoz', async ({ page }) => {
    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('networkidle');

    // And I click a document card header which contains "Employee Handbook"
    // Employee Handbook is not in the first 6 cards, so load more first
    await page.getByTestId('load-more-button').click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('card-grid').locator('[data-slot="card-header"]').filter({ hasText: 'Employee Handbook' }).click();

    // Then I should see the document detail header contains "Employee Handbook"
    await expect(page.getByTestId('detail-header').getByRole('heading', { level: 1 })).toContainText('Employee Handbook');

    // When I wait for "5" seconds
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 5000)));

    // And I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // Wait for OTEL batch processor to flush traces
    await page.waitForFunction(() => new Promise((r) => setTimeout(r, 17000)).then(() => true));

    // Then SigNoz should contain a trace span for "web-vital.LCP"
    const lcpSpan = querySigNozWebVital('web-vital.LCP');
    expect(lcpSpan).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(lcpSpan).toMatch(/nav_type:\s+navigate/);
    expect(lcpSpan).toMatch(/rating:\s+good/);
    // And the span should include a numeric "web_vital.value" attribute
    expect(lcpSpan).toMatch(/value:\s+\d/);

    // And SigNoz should contain a trace span for "web-vital.CLS"
    const clsSpan = querySigNozWebVital('web-vital.CLS');
    expect(clsSpan).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(clsSpan).toMatch(/nav_type:\s+navigate/);
    expect(clsSpan).toMatch(/rating:\s+good/);
    // And the span should include a numeric "web_vital.value" attribute
    expect(clsSpan).toMatch(/value:\s+\d/);

    // And SigNoz should contain a trace span for "web-vital.FCP"
    const fcpSpan = querySigNozWebVital('web-vital.FCP');
    expect(fcpSpan).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(fcpSpan).toMatch(/nav_type:\s+navigate/);
    expect(fcpSpan).toMatch(/rating:\s+good/);
    // And the span should include a numeric "web_vital.value" attribute
    expect(fcpSpan).toMatch(/value:\s+\d/);

    // And SigNoz should contain a trace span for "web-vital.TTFB"
    const ttfbSpan = querySigNozWebVital('web-vital.TTFB');
    expect(ttfbSpan).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(ttfbSpan).toMatch(/nav_type:\s+navigate/);
    expect(ttfbSpan).toMatch(/rating:\s+good/);
    // And the span should include a numeric "web_vital.value" attribute
    expect(ttfbSpan).toMatch(/value:\s+\d/);

    // And SigNoz should contain a trace span for "web-vital.INP"
    const inpSpan = querySigNozWebVital('web-vital.INP', {
      extraWhere: ` AND attributes_string['web_vital.navigation_type'] = 'navigate'`,
    });
    expect(inpSpan).toMatch(/svc:\s+legaldoc-ai-web/);
    expect(inpSpan).toMatch(/nav_type:\s+navigate/);
    expect(inpSpan).toMatch(/rating:\s+good/);
    // And the span should include a numeric "web_vital.value" attribute
    expect(inpSpan).toMatch(/value:\s+\d/);
  });
});
