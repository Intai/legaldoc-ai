import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';

// ============================================================
// Test Suite
// ============================================================

test.describe('Feature: Confirm Draft Document', () => {
  test('CD-01: Show "Confirm Draft" button only for documents with Draft status @purge-data', async ({ page }) => {
    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And I click a "Draft" document status badge
    const draftCard = page.getByTestId('card-grid').locator('a').filter({ hasText: 'Draft' }).first();
    await draftCard.click();

    // Then the browser URL should match "/documents/:id"
    await expect(page).toHaveURL(/\/documents\/[a-f0-9]+/);

    // And the action bar should display a "Confirm Draft" button
    await expect(page.getByTestId('action-bar').getByTestId('confirm-draft-button')).toBeVisible();

    // And the "Confirm Draft" button should be enabled
    await expect(page.getByTestId('action-bar').getByTestId('confirm-draft-button')).toBeEnabled();

    // When I click the "Back to Documents" link
    await page.getByTestId('action-bar').getByTestId('back-link').click();

    // And I click a "Done" document status badge
    const doneCard = page.getByTestId('card-grid').locator('a').filter({ hasText: 'Done' }).first();
    await doneCard.click();

    // Then the action bar should not display a "Confirm Draft" button
    await expect(page.getByTestId('action-bar').getByTestId('confirm-draft-button')).toBeHidden();

    // And the action bar should display an "Export PDF" button
    await expect(page.getByTestId('action-bar').getByTestId('export-pdf-button')).toBeVisible();
  });

  test('CD-02: Hide export button label on mobile when both buttons are rendered', async ({ page }) => {
    // Given the browser viewport is 375px
    await page.setViewportSize({ width: 375, height: 812 });

    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And I click a "Draft" document status badge
    const draftCard = page.getByTestId('card-grid').locator('a').filter({ hasText: 'Draft' }).first();
    await draftCard.click();

    // Then the action bar should display a "Confirm Draft" button with visible label
    await expect(page.getByTestId('action-bar').getByTestId('confirm-draft-button')).toBeVisible();
    await expect(page.getByTestId('action-bar').getByTestId('confirm-draft-button')).toContainText('Confirm Draft');

    // And the "Export PDF" button should show only the icon without label text
    await expect(page.getByTestId('action-bar').getByTestId('export-pdf-button')).toBeVisible();
    await expect(page.getByTestId('action-bar').getByTestId('export-pdf-button').locator('span')).toBeHidden();
  });

  test('CD-03: Show error dialog when confirm draft API fails', async ({ page, context }) => {
    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And I click a "Draft" document status badge
    const draftCard = page.getByTestId('card-grid').locator('a').filter({ hasText: 'Draft' }).first();
    await draftCard.click();

    // Then the action bar should display a "Confirm Draft" button
    await expect(page.getByTestId('action-bar').getByTestId('confirm-draft-button')).toBeVisible();

    // When the browser network is offline
    await context.setOffline(true);

    // And I click the "Confirm Draft" button
    await page.getByTestId('action-bar').getByTestId('confirm-draft-button').click();

    // Then a global error dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // And the dialog should display a title and description
    await expect(page.getByRole('dialog').getByRole('heading')).toBeVisible();
    await expect(page.getByRole('dialog').locator('p')).toBeVisible();

    // When I click the close button on the dialog
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

    // Then the "Confirm Draft" button should be enabled
    await expect(page.getByTestId('action-bar').getByTestId('confirm-draft-button')).toBeEnabled();

    // Restore online mode
    await context.setOffline(false);
  });

  test('CD-04: Confirm a draft document and update status to Done', async ({ page }) => {
    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And I click a "Draft" document status badge
    const draftCard = page.getByTestId('card-grid').locator('a').filter({ hasText: 'Draft' }).first();
    await draftCard.click();

    // And I click the "Confirm Draft" button
    await page.getByTestId('action-bar').getByTestId('confirm-draft-button').click();

    // Then the "Confirm Draft" button should no longer be visible
    await expect(page.getByTestId('action-bar').getByTestId('confirm-draft-button')).toBeHidden();

    // And the "Export PDF" button should be visible
    await expect(page.getByTestId('action-bar').getByTestId('export-pdf-button')).toBeVisible();

    // When I click the "Back to Documents" link
    await page.getByTestId('action-bar').getByTestId('back-link').click();

    // Then the confirmed document card should show "Done" status
    await expect(page.getByTestId('card-grid').locator('a').filter({ hasText: 'One-Way NDA' }).first()).toContainText('Done');
  });

  test('CD-05: Disable "Confirm Draft" button while save request is in progress @purge-data', async ({ page }) => {
    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And I click a "Draft" document status badge
    const draftCard = page.getByTestId('card-grid').locator('a').filter({ hasText: 'Draft' }).first();
    await draftCard.click();

    // And the browser uses "page.waitForTimeout" to delay route "api/v1/documents/*/status" for "300" seconds
    await page.route('**/api/v1/documents/*/status', async (route) => {
      await page.waitForTimeout(300000);
      await route.continue();
    });

    // And I click the "Confirm Draft" button
    await page.getByTestId('action-bar').getByTestId('confirm-draft-button').click();

    // Then the "Confirm Draft" button should be disabled
    await expect(page.getByTestId('action-bar').getByTestId('confirm-draft-button')).toBeDisabled();

    // When the browser "page.unrouteAll" ignoring errors
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    // Then the "Confirm Draft" button should no longer be visible
    await expect(page.getByTestId('action-bar').getByTestId('confirm-draft-button')).toBeHidden();
  });
});
