import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';

// ============================================================
// Test Suite
// ============================================================

test.describe('Feature: Documents Page', () => {
  test('DP-01: Display page title and document cards @purge-data', async ({ page }) => {
    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // Given I am on the documents page
    await page.goto('http://localhost:8080/');

    // Then the topbar should display an assistant input
    await expect(page.getByTestId('topbar').getByTestId('assistant-input')).toBeVisible();

    // And the topbar should display a user avatar
    await expect(page.getByTestId('topbar').getByTestId('user-avatar')).toBeVisible();

    // And the sidebar should show "Documents" as the active navigation item
    await expect(
      page.getByTestId('sidebar').getByTestId('sidebar-nav').getByRole('link', { name: 'Documents' })
    ).toHaveAttribute('class', /bg-primary-100/);

    // And the sidebar should show "New Document" as a navigation item
    await expect(
      page.getByTestId('sidebar').getByTestId('sidebar-nav').getByRole('link', { name: 'New Document' })
    ).toBeVisible();

    // And I should see "Documents" as the page title
    await expect(page.getByTestId('page-title')).toHaveText('Documents');

    // And I should see document cards in a grid layout
    await expect(page.getByTestId('card-grid')).toBeVisible();

    // And each card should display a title
    await expect(page.getByTestId('card-grid').getByRole('link')).toHaveCount(6);

    // And each card should display a status badge
    await expect(page.getByTestId('card-grid').locator('[data-testid^="status-badge-"]')).toHaveCount(6);

    // And each card should display a maximum 2-line description snippet
    await expect(page.getByTestId('card-grid').locator('p.line-clamp-2')).toHaveCount(6);

    // And each card should display a type badge
    await expect(page.getByTestId('card-grid').locator('[data-testid^="type-badge-"]')).toHaveCount(6);

    // And each card should display a date
    const firstCardText = await page.getByTestId('card-grid').getByRole('link').first().textContent();
    expect(firstCardText).toMatch(/\w{3} \d{1,2}, \d{4}/);

    // And each card should display a page count
    expect(firstCardText).toMatch(/\d+ pages/);

    // And cards with "Done" status should display a success badge
    await expect(
      page.getByTestId('card-grid').locator('[data-testid^="status-badge-"]', { hasText: 'Done' }).first()
    ).toHaveAttribute('class', /bg-success/);

    // And cards with "Draft" status should display a warning badge
    await expect(
      page.getByTestId('card-grid').locator('[data-testid^="status-badge-"]', { hasText: 'Draft' }).first()
    ).toHaveAttribute('class', /bg-warning/);

    // And cards with "Generating" status should display a primary badge
    await expect(
      page.getByTestId('card-grid').locator('[data-testid^="status-badge-"]', { hasText: 'Generating' }).first()
    ).toHaveAttribute('class', /bg-primary/);
  });

  test('DP-02: Default sort is most recent', async ({ page }) => {
    // Given I am on the documents page
    await page.goto('http://localhost:8080/');

    // Then the sort dropdown should show "Most Recent"
    await expect(page.getByTestId('controls-row').getByTestId('sort-select')).toContainText('Most Recent');

    // And documents should be ordered by date descending
    const isDateDescending = await page.getByTestId('card-grid').evaluate((grid) => {
      const links = grid.querySelectorAll('a');
      const dates = Array.from(links).map(link => {
        const m = link.textContent.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}/);
        return m ? new Date(m[0]).getTime() : 0;
      });
      return dates.every((d, i) => i === 0 || d <= dates[i - 1]);
    });
    expect(isDateDescending).toBe(true);

    // When I select "A-Z" from the sort dropdown
    await page.getByTestId('controls-row').getByTestId('sort-select').click();
    await page.getByRole('option', { name: 'A-Z' }).click();

    // Then documents should be ordered alphabetically by title
    const isAlphabetical = await page.getByTestId('card-grid').evaluate((grid) => {
      const cards = grid.querySelectorAll('[data-testid^="document-card-"]');
      const titles = Array.from(cards).map(card => card.children[0]?.children[0]?.children[0]?.textContent || '');
      const sorted = [...titles].sort((a, b) => a.localeCompare(b));
      return JSON.stringify(titles) === JSON.stringify(sorted);
    });
    expect(isAlphabetical).toBe(true);

    // When I select "Most Recent" from the sort dropdown
    await page.getByTestId('controls-row').getByTestId('sort-select').click();
    await page.getByRole('option', { name: 'Most Recent' }).click();

    // Then documents should be ordered by date descending
    const isDateDescendingAgain = await page.getByTestId('card-grid').evaluate((grid) => {
      const links = grid.querySelectorAll('a');
      const dates = Array.from(links).map(link => {
        const m = link.textContent.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}/);
        return m ? new Date(m[0]).getTime() : 0;
      });
      return dates.every((d, i) => i === 0 || d <= dates[i - 1]);
    });
    expect(isDateDescendingAgain).toBe(true);
  });

  test('DP-03: Default filter shows all types', async ({ page }) => {
    // Given the browser viewport is 768px
    await page.setViewportSize({ width: 768, height: 1024 });

    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // Then the card grid should display in two columns
    const colCount = await page.getByTestId('card-grid').evaluate(
      (el) => window.getComputedStyle(el).gridTemplateColumns.split(' ').length
    );
    expect(colCount).toBe(2);

    // And the type filter dropdown should show "All Types"
    await expect(page.getByTestId('controls-row').getByTestId('type-filter-select')).toContainText('All Types');

    // And I should see documents of all types
    const hasAllTypes = await page.getByTestId('card-grid').evaluate((el) => {
      const badges = el.querySelectorAll('[data-testid^="type-badge-"]');
      const types = new Set(Array.from(badges).map((b) => b.textContent.trim()));
      return ['Contract', 'Employment', 'NDA', 'Policy'].every((t) => types.has(t));
    });
    expect(hasAllTypes).toBe(true);

    // When I select "Contract" from the type filter dropdown
    await page.getByTestId('controls-row').getByTestId('type-filter-select').click();
    await page.getByRole('option', { name: 'Contract' }).click();

    // Then I should only see documents with type "Contract"
    const allContract = await page.getByTestId('card-grid').evaluate((el) => {
      const badges = el.querySelectorAll('[data-testid^="type-badge-"]');
      return Array.from(badges).every((b) => b.textContent.trim() === 'Contract') && badges.length > 0;
    });
    expect(allContract).toBe(true);

    // When I select "Policy" from the type filter dropdown
    await page.getByTestId('controls-row').getByTestId('type-filter-select').click();
    await page.getByRole('option', { name: 'Policy' }).click();

    // Then I should only see documents with type "Policy"
    const allPolicy = await page.getByTestId('card-grid').evaluate((el) => {
      const badges = el.querySelectorAll('[data-testid^="type-badge-"]');
      return Array.from(badges).every((b) => b.textContent.trim() === 'Policy') && badges.length > 0;
    });
    expect(allPolicy).toBe(true);

    // When I select "Employment" from the type filter dropdown
    await page.getByTestId('controls-row').getByTestId('type-filter-select').click();
    await page.getByRole('option', { name: 'Employment' }).click();

    // Then I should only see documents with type "Employment"
    const allEmployment = await page.getByTestId('card-grid').evaluate((el) => {
      const badges = el.querySelectorAll('[data-testid^="type-badge-"]');
      return Array.from(badges).every((b) => b.textContent.trim() === 'Employment') && badges.length > 0;
    });
    expect(allEmployment).toBe(true);

    // When I select "NDA" from the type filter dropdown
    await page.getByTestId('controls-row').getByTestId('type-filter-select').click();
    await page.getByRole('option', { name: 'NDA' }).click();

    // Then I should only see documents with type "NDA"
    const allNDA = await page.getByTestId('card-grid').evaluate((el) => {
      const badges = el.querySelectorAll('[data-testid^="type-badge-"]');
      return Array.from(badges).every((b) => b.textContent.trim() === 'NDA') && badges.length > 0;
    });
    expect(allNDA).toBe(true);

    // When I select "All Types" from the type filter dropdown
    await page.getByTestId('controls-row').getByTestId('type-filter-select').click();
    await page.getByRole('option', { name: 'All Types' }).click();

    // Then I should see documents of all types
    const hasAllTypesAgain = await page.getByTestId('card-grid').evaluate((el) => {
      const badges = el.querySelectorAll('[data-testid^="type-badge-"]');
      const types = new Set(Array.from(badges).map((b) => b.textContent.trim()));
      return ['Contract', 'Employment', 'NDA', 'Policy'].every((t) => types.has(t));
    });
    expect(hasAllTypesAgain).toBe(true);
  });

  test('DP-04: Sidebar is hidden on mobile by default', async ({ page }) => {
    // Given the browser viewport is 375px
    await page.setViewportSize({ width: 375, height: 812 });

    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // Then the sidebar should not be visible
    await expect(page.locator('[data-slot="sidebar"]')).toBeHidden();

    // And a lucide panel-left icon should be visible in the topbar
    await expect(page.getByTestId('topbar').getByTestId('sidebar-trigger')).toBeVisible();

    // And the card grid should display in a single column
    const colCount = await page.getByTestId('card-grid').evaluate(
      (el) => window.getComputedStyle(el).gridTemplateColumns.split(' ').length
    );
    expect(colCount).toBe(1);

    // When I tap the lucide panel-left icon
    await page.getByTestId('topbar').getByTestId('sidebar-trigger').click();

    // Then the sidebar should slide in from the left
    await expect(page.getByRole('dialog', { name: 'Sidebar' })).toBeVisible();

    // And a semi-transparent overlay should cover the content area
    await expect(page.locator('[data-slot="sheet-overlay"]')).toBeVisible();

    // When I tap the overlay
    await page.locator('[data-slot="sheet-overlay"]').click({ position: { x: 350, y: 400 } });

    // Then the sidebar should close
    await expect(page.getByRole('dialog', { name: 'Sidebar' })).toBeHidden();

    // And the overlay should disappear
    await expect(page.locator('[data-slot="sheet-overlay"]')).toBeHidden();
  });

  test('DP-05: Show skeleton cards while loading', async ({ page }) => {
    // Given the browser uses "page.waitForTimeout" to delay route "api/v1/documents" for "60" seconds
    await page.route('**/api/v1/documents**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 60000));
      await route.continue();
    });

    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // Then I should see 6 skeleton cards with animated pulse effect
    await expect(page.getByTestId('skeleton-grid').locator('[data-slot="card"]')).toHaveCount(6);

    // And the sort dropdown should be visible but disabled
    await expect(page.getByTestId('controls-row').getByTestId('sort-select')).toBeVisible();
    await expect(page.getByTestId('controls-row').getByTestId('sort-select')).toBeDisabled();

    // And the type filter dropdown should be visible but disabled
    await expect(page.getByTestId('controls-row').getByTestId('type-filter-select')).toBeVisible();
    await expect(page.getByTestId('controls-row').getByTestId('type-filter-select')).toBeDisabled();

    // When the browser network speed is unthrottled
    await page.unroute('**/api/v1/documents**');

    // And I wait for 300 milliseconds
    await page.waitForTimeout(300);

    // Then the skeleton cards should be replaced by actual document cards
    await expect(page.getByTestId('skeleton-grid')).toBeHidden();
    await expect(page.getByTestId('card-grid').locator('[data-testid^="document-card-"]')).toHaveCount(6);

    // And the sort dropdown should be enabled
    await expect(page.getByTestId('controls-row').getByTestId('sort-select')).toBeEnabled();

    // And the type filter dropdown should be enabled
    await expect(page.getByTestId('controls-row').getByTestId('type-filter-select')).toBeEnabled();
  });

  test('DP-06: Show empty state when no documents exist', async ({ page }) => {
    // When I delete all documents in the database
    execSync(
      'docker compose exec -T mongodb mongosh --username admin --password password --authenticationDatabase admin legaldoc --eval "db.documents.deleteMany({})"',
      { stdio: 'inherit' }
    );

    // And I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // Then I should see the message "No documents yet."
    await expect(page.getByTestId('empty-state').getByText('No documents yet.')).toBeVisible();

    // And I should see the description "Create your first document to get started."
    await expect(page.getByTestId('empty-state').getByText('Create your first document to get started.')).toBeVisible();

    // And I should see a "New Document" CTA button
    await expect(page.getByTestId('empty-state').getByRole('button', { name: 'New Document' })).toBeVisible();

    // When I click the "New Document" CTA button
    await page.getByTestId('empty-state').getByRole('button', { name: 'New Document' }).click();

    // Then the browser URL should be "/documents/new"
    await expect(page).toHaveURL(/\/documents\/new/);
  });

  test('DP-07: Show filter-empty state when no documents match the selected filter', async ({ page }) => {
    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When I delete all "NDA" documents in the database
    execSync(
      'docker compose exec -T mongodb mongosh --username admin --password password --authenticationDatabase admin legaldoc --eval "db.documents.deleteMany({type: \'NDA\'})"',
      { stdio: 'inherit' }
    );

    // And I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // And I select "NDA" from the type filter dropdown
    await page.getByTestId('controls-row').getByTestId('type-filter-select').click();
    await page.getByRole('option', { name: 'NDA' }).click();

    // Then I should see the message "No documents match your filters."
    await expect(page.getByTestId('empty-state').getByText('No documents match your filters.')).toBeVisible();

    // And I should see the description "Try adjusting your filters."
    await expect(page.getByTestId('empty-state').getByText('Try adjusting your filters.')).toBeVisible();

    // And I should not see a CTA button
    await expect(page.getByTestId('empty-state').getByRole('button')).toHaveCount(0);
  });

  test('DP-08: Show load more button when more pages are available', async ({ page }) => {
    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // Then I should see a "Load more" button centered below the card grid
    await expect(page.getByTestId('load-more-button')).toBeVisible();

    // When the browser uses "page.waitForTimeout" to delay route "api/v1/documents" for "60" seconds
    await page.route('**/api/v1/documents**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 60000));
      await route.continue();
    });

    // And I click the "Load more" button
    await page.getByTestId('load-more-button').click();

    // Then the button label should change to a spinner
    await expect(page.getByTestId('load-more-button').locator('.animate-spin')).toBeVisible();

    // And the button should be disabled
    await expect(page.getByTestId('load-more-button')).toBeDisabled();

    // When the browser network speed is unthrottled
    await page.unroute('**/api/v1/documents**');

    // And I wait for 300 milliseconds
    await page.waitForTimeout(300);

    // Then additional document cards should be appended to the grid
    await expect(page.getByTestId('card-grid').locator('[data-testid^="document-card-"]')).toHaveCount(11);

    // And the "Load more" button should not be visible
    await expect(page.getByTestId('load-more-button')).toBeHidden();
  });

  test('DP-09: Show error dialog when document list API fails', async ({ page, context }) => {
    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // Then I should see the sort dropdown
    await expect(page.getByTestId('controls-row').getByTestId('sort-select')).toBeVisible();

    // When the browser network speed is offline
    await context.setOffline(true);

    // And I select "A-Z" from the sort dropdown
    await page.getByTestId('controls-row').getByTestId('sort-select').click();
    await page.getByRole('option', { name: 'A-Z' }).click();

    // Then a global error dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // And the dialog should display a title and description
    await expect(page.getByRole('dialog').getByRole('heading')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Failed to fetch')).toBeVisible();

    // And the dialog should include a close button
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Close' })).toBeVisible();

    // When I click the close button on the dialog
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

    // Then the dialog should close
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('DP-10: Show error dialog when load more API fails', async ({ page, context }) => {
    // When I navigate to the documents page at "/"
    await page.goto('http://localhost:8080/');

    // Then I should see a "Load more" button
    await expect(page.getByTestId('load-more-button')).toBeVisible();

    // When the browser network speed is offline
    await context.setOffline(true);

    // And I click the "Load more" button
    await page.getByTestId('load-more-button').click();

    // Then a global error dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // When I click the close button on the dialog
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

    // Then the previously loaded document cards should remain visible
    await expect(page.getByTestId('card-grid').locator('[data-testid^="document-card-"]')).toHaveCount(6);
  });

  test('DP-11: Navigate and activate controls using keyboard', async ({ page }) => {
    // When I am on the documents page
    await page.goto('http://localhost:8080');

    // Then I should see the sort dropdown enabled
    await expect(page.getByTestId('sort-select')).toBeEnabled();

    // When I press "Tab" to move focus forward
    // Tab order: Documents link → New Document link → Toggle Sidebar → Search input → Sort select
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Then focus should move to the sort dropdown
    await expect(page.getByTestId('sort-select')).toBeFocused();

    // When I press "Enter" on the sort dropdown
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Then the sort dropdown options should be visible
    await expect(page.getByRole('listbox')).toBeVisible();

    // When I press "ArrowDown" to highlight "A-Z"
    await page.keyboard.press('ArrowDown');

    // And I press "Enter" to select "A-Z"
    await page.keyboard.press('Enter');

    // Then the sort dropdown should show "A-Z"
    await expect(page.getByTestId('sort-select')).toContainText('A-Z');

    // And documents should be ordered alphabetically by title
    const isAlphabetical = await page.getByTestId('card-grid').evaluate((grid) => {
      const cards = grid.querySelectorAll('[data-testid^="document-card-"]');
      const titles = Array.from(cards).map(card => card.children[0]?.children[0]?.children[0]?.textContent || '');
      const sorted = [...titles].sort((a, b) => a.localeCompare(b));
      return JSON.stringify(titles) === JSON.stringify(sorted);
    });
    expect(isAlphabetical).toBe(true);

    // And I should see the type filter dropdown enabled
    await expect(page.getByTestId('type-filter-select')).toBeEnabled();

    // When I press "Tab" to move focus forward
    // After sort dropdown selection, tab through to type filter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Then focus should move to the type filter dropdown
    await expect(page.getByTestId('type-filter-select')).toBeFocused();

    // When I press "Space" on the type filter dropdown
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // Then the type filter dropdown options should be visible
    await expect(page.getByRole('listbox')).toBeVisible();

    // When I press "ArrowDown" to highlight "Contract"
    await page.keyboard.press('ArrowDown');

    // And I press "Enter" to select "Contract"
    await page.keyboard.press('Enter');

    // Then the type filter dropdown should show "Contract"
    await expect(page.getByTestId('type-filter-select')).toContainText('Contract');

    // And I should only see documents with type "Contract"
    const allContract = await page.getByTestId('card-grid').evaluate((grid) => {
      const badges = grid.querySelectorAll('[data-testid^="type-badge-"]');
      return Array.from(badges).every((b) => b.textContent.trim() === 'Contract') && badges.length > 0;
    });
    expect(allContract).toBe(true);

    // And I should see the sort dropdown enabled
    await expect(page.getByTestId('sort-select')).toBeEnabled();

    // When I press "Tab" until focus reaches the first document card
    await page.evaluate(() => document.querySelector('[data-testid="card-grid"] a').focus());

    // And I press "Enter" on the first document card
    await page.keyboard.press('Enter');

    // Then the browser URL should match "/documents/.+"
    await expect(page).toHaveURL(/\/documents\/.+/);

    // When I navigate back to the documents page
    await page.goto('http://localhost:8080');

    // Then I should see the sort dropdown enabled
    await expect(page.getByTestId('sort-select')).toBeEnabled();

    // When I press "Tab" until focus reaches the "Load more" button
    await page.evaluate(() => document.querySelector('[data-testid="load-more-button"]').focus());

    // And I press "Space" on the "Load more" button
    await page.keyboard.press('Space');

    // Then additional document cards should be appended to the grid
    await expect(page.getByTestId('card-grid').locator('a')).toHaveCount(11);

    // When I press "Shift+Tab" to move focus backward
    await page.keyboard.press('Shift+Tab');

    // Then focus should move to the last document card in the grid
    await expect(page.getByTestId('card-grid').locator('a').last()).toBeFocused();
  });
});
