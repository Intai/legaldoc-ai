import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';

// ============================================================
// Test Suite
// ============================================================

test.describe('Feature: Document Detail Page', () => {
  test('DDP-01: Display document detail with metadata', async ({ page }) => {
    // @purge-data - Restore the seed data to initial state
    execSync(
      'docker compose exec -T mongodb mongosh --username admin --password password --authenticationDatabase admin legaldoc --eval "db.documents.deleteMany({})"',
      { stdio: 'inherit' }
    );
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And I select "Employment" from the type filter dropdown
    await page.getByTestId('type-filter-select').click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Employment' }).click();

    // And I click a document card "Employee Handbook"
    await page.getByRole('link', { name: /Employee Handbook/ }).click();

    // Then the browser URL should match "/documents/:id"
    await expect(page).toHaveURL(/\/documents\/[a-f0-9]{24}/);

    // And the sidebar should show "Documents" as the active navigation item
    const docsLink = page.getByTestId('sidebar-nav').getByRole('link', { name: 'Documents' });
    const isActive = await docsLink.evaluate(
      (el) => el.className.includes('font-semibold')
    );
    expect(isActive).toBe(true);

    // And I should see the document title as an H1 heading
    await expect(
      page.getByTestId('detail-header').getByRole('heading', { level: 1 })
    ).toHaveText('Employee Handbook');

    // And I should see a type badge next to the title
    await expect(
      page.getByTestId('detail-header').locator('span').filter({ hasText: 'Employment' }).first()
    ).toBeVisible();

    // And I should see the creation date in "Created MMM DD, YYYY" format
    await expect(
      page.getByTestId('detail-header').getByText(/Created \w{3} \d{1,2}, \d{4}/)
    ).toBeVisible();

    // And I should see a centered document viewer area
    await expect(page.getByTestId('pdf-container')).toBeVisible();
    const isCentered = await page.getByTestId('pdf-container').evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.marginLeft === style.marginRight;
    });
    expect(isCentered).toBe(true);

    // And the PDF viewer should render all pages of the document
    await expect(
      page.getByTestId('pdf-container').locator('.react-pdf__Page')
    ).toHaveCount(3);

    // And the content area should scroll vertically for long documents
    const canScroll = await page.locator('main.overflow-y-auto').evaluate(
      (el) => window.getComputedStyle(el).overflowY === 'auto'
    );
    expect(canScroll).toBe(true);

    // And I should see a sticky action bar at the top of the content area
    const isSticky = await page.getByTestId('action-bar').evaluate(
      (el) => window.getComputedStyle(el).position === 'sticky'
    );
    expect(isSticky).toBe(true);

    // And the action bar should display a "Back to Documents" link with an arrow icon
    await expect(page.getByTestId('action-bar').getByTestId('back-link')).toBeVisible();
    const hasArrowIcon = await page.getByTestId('back-link').evaluate(
      (el) => !!el.querySelector('svg')
    );
    expect(hasArrowIcon).toBe(true);

    // And the action bar should display an "Export PDF" button
    await expect(
      page.getByTestId('action-bar').getByTestId('export-pdf-button')
    ).toBeVisible();

    // And the action bar should have a bottom border separator
    const hasBorder = await page.getByTestId('action-bar').evaluate(
      (el) => window.getComputedStyle(el).borderBottomWidth === '1px'
    );
    expect(hasBorder).toBe(true);

    // When I click the "Export PDF" button
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-pdf-button').click();

    // Then "Employee Handbook.pdf" file should be downloaded via the browser
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Employee Handbook.pdf');
  });

  test('DDP-02: Show loading skeleton while document loads', async ({ page }) => {
    // When the browser uses "page.waitForTimeout" to delay route "api/v1/documents/*" for "300" seconds
    await page.route('**/api/v1/documents/*', async (route) => {
      await page.waitForTimeout(300000);
      await route.continue();
    });

    // And I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And I click a document card "Cookie Policy"
    await page.getByRole('link', { name: /Cookie Policy/ }).click();

    // Then I should see a skeleton placeholder for the document title
    await expect(
      page.getByTestId('document-detail-skeleton').locator('[data-slot="skeleton"]').first()
    ).toBeVisible();

    // And I should see a skeleton placeholder for the type badge and date
    await expect(
      page.getByTestId('document-detail-skeleton').locator('div.mt-2 > [data-slot="skeleton"]')
    ).toHaveCount(2);

    // And I should see a skeleton placeholder for the document viewer area
    await expect(page.getByTestId('document-detail-skeleton')).toBeVisible();

    // And the "Export PDF" button should not be visible
    await expect(page.getByTestId('export-pdf-button')).toBeHidden();

    // When the browser network speed is unthrottled
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    // Then the skeleton placeholders should be replaced by actual content
    await expect(
      page.getByTestId('detail-header').getByRole('heading', { level: 1 })
    ).toHaveText('Cookie Policy');

    // And the "Export PDF" button should be enabled
    await expect(page.getByTestId('export-pdf-button')).toBeEnabled();

    // When I click the "Back to Documents" link
    await page.getByTestId('back-link').click();

    // Then the browser URL should be "/documents"
    await expect(page).toHaveURL('http://localhost:8080/');
  });

  test('DDP-03: Show error when document is not found', async ({ page }) => {
    // When I navigate to "/documents/nonexistent-id"
    await page.goto('http://localhost:8080/documents/nonexistent-id');

    // Then a global error dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // And the dialog should display a title and description
    await expect(
      page.getByRole('dialog').getByRole('heading', { level: 2 })
    ).toBeVisible();
    await expect(page.getByRole('dialog').locator('p')).toBeVisible();
  });

  test('DDP-04: Show error dialog when document detail API fails', async ({ page }) => {
    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And I click a document card "Cookie Policy"
    await page.getByRole('link', { name: /Cookie Policy/ }).click();

    // And I click the "Back to Documents" link
    await page.getByTestId('back-link').click();

    // And the browser network is offline
    await page.context().setOffline(true);

    // And I click a document card "Office Lease Agreement"
    await page.getByRole('link', { name: /Office Lease Agreement/ }).click();

    // Then a global error dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // And the dialog should display a title and description
    await expect(
      page.getByRole('dialog').getByRole('heading', { level: 2 })
    ).toBeVisible();
    await expect(page.getByRole('dialog').locator('p')).toBeVisible();

    // And the dialog should include a close button
    await expect(
      page.getByRole('dialog').getByRole('button', { name: 'Close' })
    ).toBeVisible();

    // Cleanup: restore network
    await page.context().setOffline(false);
  });
});
