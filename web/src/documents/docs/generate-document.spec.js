import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Test Suite
// ============================================================

test.describe('Feature: Document Generation via LangGraph AI Workflow', () => {
  test('GD-01 - Generate a document from multiple selected references @timeout-600s', async ({ page }) => {
    test.setTimeout(600000);

    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // And I click the upload area and select "web/src/documents/docs/NDA Template.pdf"
    await page
      .getByTestId('upload-area')
      .getByTestId('upload-input')
      .setInputFiles(path.resolve(__dirname, 'NDA Template.pdf'));
    await page.waitForLoadState('networkidle');

    // And I select the "NDA Template" reference
    await page.getByTestId('reference-list').getByLabel(/^NDA Template/).click();

    // And I select the "Service Agreement" reference
    await page.getByTestId('reference-list').getByLabel(/^Service Agreement/).click();

    // And I click the "Next" button
    await page.getByTestId('new-document-page').getByTestId('next-button').click();

    // And I type "Create a combined confidentiality and service agreement" into the context textarea
    await page
      .getByTestId('new-document-page')
      .getByTestId('provide-context-step')
      .getByTestId('context-textarea')
      .fill('Create a combined confidentiality and service agreement');

    // And I click the "Generate Document" button
    await page
      .getByTestId('new-document-page')
      .getByTestId('provide-context-step')
      .getByTestId('generate-button')
      .click();

    // Then I should be on step 3
    await expect(
      page.getByTestId('new-document-page').getByTestId('review-save-step'),
    ).toBeVisible();

    // And all four phases should complete with checkmarks
    await expect(
      page
        .getByTestId('new-document-page')
        .getByTestId('review-save-step')
        .getByTestId('phase-icon-check'),
    ).toHaveCount(4, { timeout: 600000 });

    // And the PDF viewer should render the generated document
    await expect(
      page
        .getByTestId('new-document-page')
        .getByTestId('review-save-step')
        .getByTestId('doc-viewer-wrap')
        .locator('canvas'),
    ).toBeVisible();
  });

  test('GD-02 - Show error dialog when generation fails via SSE error event', async ({
    page,
  }) => {
    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // And the browser intercepts POST "/api/v1/documents/generate" to respond with an SSE error event
    await page.route('**/api/v1/documents/generate', async (route) => {
      const sseBody =
        'event: error\ndata: {"message":"Internal server error","code":"GENERATION_FAILED"}\n\n';
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseBody,
      });
    });

    // And I select the "NDA Template" reference
    await page.getByTestId('reference-list').getByLabel(/^NDA Template/).click();

    // And I click the "Next" button
    await page.getByTestId('new-document-page').getByTestId('next-button').click();

    // And I type "Create an NDA" into the context textarea
    await page
      .getByTestId('provide-context-step')
      .getByTestId('context-textarea')
      .fill('Create an NDA');

    // And I click the "Generate Document" button
    await page
      .getByTestId('provide-context-step')
      .getByTestId('footer-bar')
      .getByTestId('generate-button')
      .click();

    // Then a global error dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // And the dialog should display a title and description
    await expect(
      page.getByRole('dialog').getByRole('heading', { level: 2 }),
    ).toContainText('Something went wrong');
    await expect(page.getByRole('dialog').locator('p')).toContainText(
      'Internal server error',
    );

    // And the phase progress should reset
    await expect(
      page.getByTestId('phase-progress').getByTestId('phase-icon-pending'),
    ).toHaveCount(4);

    // And the "Save" button should be disabled
    await expect(
      page.getByTestId('new-document-page').getByTestId('footer-bar').getByTestId('save-button'),
    ).toBeDisabled();

    // And the "Export PDF" button should be disabled
    await expect(
      page
        .getByTestId('new-document-page')
        .getByTestId('footer-bar')
        .getByTestId('export-pdf-button'),
    ).toBeDisabled();

    // When I click the close button on the dialog
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

    // Then the dialog should close
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('GD-03 - Show error dialog when network fails during generation', async ({
    page,
    context,
  }) => {
    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // And I select the "NDA Template" reference
    await page.getByTestId('reference-list').getByLabel(/^NDA Template/).click();

    // And I click the "Next" button
    await page.getByTestId('new-document-page').getByTestId('next-button').click();

    // And I type "Create an NDA" into the context textarea
    await page
      .getByTestId('provide-context-step')
      .getByTestId('context-textarea')
      .fill('Create an NDA');

    // And the browser network is offline
    await context.setOffline(true);

    // And I click the "Generate Document" button
    await page
      .getByTestId('provide-context-step')
      .getByTestId('generate-button')
      .click();

    // Then a global error dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // When I click the close button on the dialog
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

    // Restore network before navigating back
    await context.setOffline(false);

    // And I click the "Back" button
    await page
      .getByTestId('new-document-page')
      .getByTestId('footer-bar')
      .getByTestId('back-button')
      .click();

    // Then I should be on step 2
    await expect(
      page.getByTestId('new-document-page').getByTestId('provide-context-step'),
    ).toBeVisible();

    // And I should see the context textarea with the previously entered text
    await expect(
      page
        .getByTestId('new-document-page')
        .getByTestId('provide-context-step')
        .getByTestId('context-textarea'),
    ).toHaveValue('Create an NDA');

    // And the selected references summary should still be visible
    await expect(
      page
        .getByTestId('new-document-page')
        .getByTestId('provide-context-step')
        .getByTestId('references-summary'),
    ).toBeVisible();
  });
});
