import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';

// ============================================================
// Test Suite
// ============================================================

test.describe('Feature: Query Documents via AI Assistant', () => {
  test('QD-01: Submit a query by pressing Enter @purge-data', async ({ page }) => {
    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When the browser uses "page.waitForTimeout" to delay route "api/v1/assistant/query" for "300" seconds
    await page.route('**/api/v1/assistant/query', async (route) => {
      await page.waitForTimeout(300000);
      await route.continue();
    });

    // And I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // Then the topbar should display an assistant input with the Search icon
    await expect(page.getByTestId('topbar').getByTestId('assistant-input')).toBeVisible();

    // And the assistant input placeholder should be "Ask about your documents..."
    await expect(page.getByTestId('topbar').getByTestId('assistant-input')).toHaveAttribute('placeholder', 'Ask about your documents...');

    // And the assistant panel should not be visible
    await expect(page.getByTestId('assistant-panel')).toBeHidden();

    // When I press "Enter" on the assistant input without typing anything
    await page.getByTestId('topbar').getByTestId('assistant-input').click();
    await page.keyboard.press('Enter');

    // Then the assistant panel should not be visible
    await expect(page.getByTestId('assistant-panel')).toBeHidden();

    // When I type "What clauses should I include in an NDA?" into the assistant input
    await page.getByTestId('topbar').getByTestId('assistant-input').fill('What clauses should I include in an NDA?');

    // And I press "Enter" on the assistant input
    await page.keyboard.press('Enter');

    // Then the assistant panel should appear below the assistant input
    await expect(page.getByTestId('assistant-panel')).toBeVisible();

    // And the assistant panel should show a loading state
    await expect(page.getByTestId('assistant-panel').getByTestId('assistant-panel-loading')).toBeVisible();

    // When I press "Escape"
    await page.keyboard.press('Escape');

    // Then the assistant panel should not be visible
    await expect(page.getByTestId('assistant-panel')).toBeHidden();

    // And the assistant input should retain the query text
    await expect(page.getByTestId('topbar').getByTestId('assistant-input')).toHaveValue('What clauses should I include in an NDA?');

    // And the browser "page.unrouteAll" ignoring errors
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  });

  test('QD-02: Display streamed answer text and source citations @timeout-600s', async ({ page }) => {
    test.setTimeout(600000);

    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');

    // And I select the "NDA Template" reference
    await page.getByTestId('reference-list').locator('label', { hasText: 'NDA Template' }).click();

    // And I click the "Next" button
    await page.getByTestId('new-document-page').getByTestId('next-button').click();

    // And I type "Between TechCorp and DataFlow Inc, 12-month term, covers shared API data" into the context textarea
    await page.getByTestId('provide-context-step').getByTestId('context-textarea').fill('Between TechCorp and DataFlow Inc, 12-month term, covers shared API data');

    // And I click the "Generate Document" button
    await page.getByTestId('new-document-page').getByTestId('generate-button').click();

    // Then I should be on step 3
    await expect(page.getByTestId('new-document-page').getByRole('button', { name: '3' })).toBeVisible();

    // And all four phases should complete with checkmarks
    await expect(page.getByTestId('new-document-page').getByTestId('phase-icon-check')).toHaveCount(4, { timeout: 600000 });

    // When I wait until Qdrant is not empty
    await page.evaluate(async () => {
      for (let i = 0; i < 120; i++) {
        const res = await fetch('http://localhost:6333/collections/legal_documents/points/count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        const data = await res.json();
        if (data.result.count > 0) return;
        await new Promise((r) => setTimeout(r, 5000));
      }
      throw new Error('Qdrant still empty after timeout');
    });

    // And I type "What clauses should I include in a non-disclosure agreement?" into the assistant input
    await page.getByTestId('topbar').getByTestId('assistant-input').fill('What clauses should I include in a non-disclosure agreement?');

    // And I press "Enter" on the assistant input
    await page.keyboard.press('Enter');

    // Then the assistant panel should appear below the assistant input
    await expect(page.getByTestId('assistant-panel')).toBeVisible({ timeout: 600000 });

    // And the answer text should be displayed in the panel
    await expect(page.getByTestId('assistant-panel').getByTestId('assistant-answer')).toBeVisible({ timeout: 600000 });

    // And I should see a "Sources" section below the answer
    await expect(page.getByTestId('assistant-panel').getByTestId('assistant-sources')).toBeVisible();

    // And the first source should display a document icon
    await expect(page.getByTestId('assistant-sources').getByTestId('assistant-source-link').first().getByTestId('assistant-source-icon')).toBeVisible();

    // And the first source should display the document title
    await expect(page.getByTestId('assistant-sources').getByTestId('assistant-source-link').first().getByTestId('assistant-source-title')).toBeVisible();

    // And the first source should display the document snippet
    await expect(page.getByTestId('assistant-sources').getByTestId('assistant-source-link').first().getByTestId('assistant-source-snippet')).toBeVisible();

    // And the first source should be a clickable link
    await expect(page.getByTestId('assistant-sources').getByTestId('assistant-source-link').first()).toBeVisible();

    // And I should see an Esc-to-close hint at the bottom of the panel
    await expect(page.getByTestId('assistant-panel').getByTestId('assistant-esc-hint')).toBeVisible();

    // When I click the first source citation link
    await page.getByTestId('assistant-sources').getByTestId('assistant-source-link').first().click();

    // Then the browser URL should match "/documents/.+"
    await expect(page).toHaveURL(/\/documents\/.+/);

    // And I should see the document detail page
    await expect(page.getByTestId('detail-header').getByRole('heading')).toBeVisible();
  });

  test('QD-03: Show no-results state when query has no relevant documents', async ({ page }) => {
    // When the browser intercepts POST "/api/v1/assistant/query" to respond with an SSE complete event with empty answer and sources
    await page.route('**/api/v1/assistant/query', async (route) => {
      const body = 'event: complete\ndata: {"answer": "", "sources": []}\n\n';
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: body,
      });
    });

    // And I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And I type "What is the weather in Tokyo?" into the assistant input
    await page.getByTestId('topbar').getByTestId('assistant-input').fill('What is the weather in Tokyo?');

    // And I press "Enter" on the assistant input
    await page.keyboard.press('Enter');

    // Then the assistant panel should show "No relevant results found. Try rephrasing your question."
    await expect(page.getByTestId('assistant-panel').getByTestId('assistant-panel-empty')).toContainText('No relevant results found. Try rephrasing your question.');

    // And I should see an Esc-to-close hint at the bottom of the panel
    await expect(page.getByTestId('assistant-panel').getByTestId('assistant-esc-hint')).toBeVisible();

    // When I click outside the assistant panel on the page content area
    await page.locator('body').click({ position: { x: 400, y: 600 } });

    // Then the assistant panel should not be visible
    await expect(page.getByTestId('assistant-panel')).toBeHidden();
  });

  test('QD-04: Show error dialog when assistant query fails via SSE error event', async ({ page }) => {
    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And the browser intercepts POST "/api/v1/assistant/query" to respond with an SSE error event
    await page.route('**/api/v1/assistant/query', async (route) => {
      const body = 'event: error\ndata: {"message": "Internal server error", "code": "INTERNAL_ERROR"}\n\n';
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: body,
      });
    });

    // And I type "What clauses do we use for termination?" into the assistant input
    await page.getByTestId('topbar').getByTestId('assistant-input').fill('What clauses do we use for termination?');

    // And I press "Enter" on the assistant input
    await page.keyboard.press('Enter');

    // Then a global error dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // And the dialog should display a title and description
    await expect(page.getByRole('dialog').getByRole('heading')).toHaveText('Something went wrong');
    await expect(page.getByRole('dialog').locator('p')).toContainText('Internal server error');

    // When I click the close button on the dialog
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

    // Then the dialog should close
    await expect(page.getByRole('dialog')).toBeHidden();

    // And the assistant panel should not be visible
    await expect(page.getByTestId('assistant-panel')).toBeHidden();
  });

  test('QD-05: Show error dialog when network fails during assistant query', async ({ page }) => {
    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And I press "Tab" until focus reaches the assistant input
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const isAssistantInput = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.getAttribute('data-testid') === 'assistant-input';
      });
      if (isAssistantInput) break;
    }

    // And I type "What clauses do we use for termination?" into the assistant input
    await page.getByTestId('topbar').getByTestId('assistant-input').fill('What clauses do we use for termination?');

    // And the browser network is offline
    await page.context().setOffline(true);

    // And I press "Enter" on the assistant input
    await page.keyboard.press('Enter');

    // Then a global error dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // And the assistant panel should not be visible
    await expect(page.getByTestId('assistant-panel')).toBeHidden();

    // Restore network
    await page.context().setOffline(false);
  });
});
