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
