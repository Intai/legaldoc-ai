import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Test Suite
// ============================================================

test.describe('Feature: New Document Page', () => {
  test('NDP-01: Display step indicator with initial state', async ({ page }) => {
    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });
    execSync(
      'docker compose exec -T mongodb mongosh --username admin --password password --authenticationDatabase admin legaldoc --eval "db.documents.deleteMany({})"',
      { stdio: 'inherit', cwd: '..' },
    );

    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // Then the sidebar should show "New Document" as the active navigation item
    await expect(
      page.getByTestId('sidebar-nav').getByRole('link', { name: 'New Document' }),
    ).toHaveAttribute('class', /bg-primary-100/);

    // And the step indicator should show 3 steps: "Select References", "Provide Context", "Review & Save"
    await expect(page.getByTestId('step-indicator').getByTestId('step-label-1')).toHaveText(
      'Select References',
    );
    await expect(page.getByTestId('step-indicator').getByTestId('step-label-2')).toHaveText(
      'Provide Context',
    );
    await expect(page.getByTestId('step-indicator').getByTestId('step-label-3')).toHaveText(
      'Review & Save',
    );

    // And step 1 should be in active state
    await expect(page.getByTestId('step-indicator').getByTestId('step-circle-1')).toHaveAttribute(
      'class',
      /border-primary/,
    );

    // And steps 2 and 3 should be in upcoming state
    await expect(page.getByTestId('step-indicator').getByTestId('step-circle-2')).toHaveAttribute(
      'class',
      /bg-neutral-100/,
    );
    await expect(page.getByTestId('step-indicator').getByTestId('step-circle-3')).toHaveAttribute(
      'class',
      /bg-neutral-100/,
    );

    // Step indicator updates on forward navigation
    // When I select the first reference
    await page.getByTestId('reference-list').getByRole('checkbox').first().click();

    // And I click the "Next" button
    await page.getByTestId('next-button').click();

    // Then step 1 should be in complete state with a checkmark icon
    await expect(page.getByTestId('step-indicator').getByTestId('step-circle-1')).toHaveAttribute(
      'class',
      /bg-primary-700/,
    );
    await expect(
      page.getByTestId('step-indicator').getByTestId('step-circle-1').locator('svg'),
    ).toBeVisible();

    // And step 2 should be in active state
    await expect(page.getByTestId('step-indicator').getByTestId('step-circle-2')).toHaveAttribute(
      'class',
      /border-primary/,
    );

    // Navigate backward using Back button
    // When I click the "Back" button
    await page.getByTestId('back-button').click();

    // Then step 1 should be in active state
    await expect(page.getByTestId('step-indicator').getByTestId('step-circle-1')).toHaveAttribute(
      'class',
      /border-primary/,
    );

    // And I should see the select references step content
    await expect(page.getByTestId('reference-list')).toBeVisible();

    // Navigate to completed step by clicking its circle
    // When I click the "Next" button again
    await page.getByTestId('next-button').click();

    // And I click the step 1 circle in the step indicator
    await page.getByTestId('step-indicator').getByTestId('step-circle-1').click();

    // Then I should see the select references step content
    await expect(page.getByTestId('reference-list')).toBeVisible();

    // And step 1 should be in active state
    await expect(page.getByTestId('step-indicator').getByTestId('step-circle-1')).toHaveAttribute(
      'class',
      /border-primary/,
    );

    // Cannot click upcoming steps
    // When I click the step 2 circle in the step indicator
    await page.getByTestId('step-indicator').getByTestId('step-circle-2').click();

    // Then I should still see the select references step content
    await expect(page.getByTestId('reference-list')).toBeVisible();

    // And step 1 should remain in active state
    await expect(page.getByTestId('step-indicator').getByTestId('step-circle-1')).toHaveAttribute(
      'class',
      /border-primary/,
    );
  });

  test('NDP-02: Mobile step indicator hides labels', async ({ page }) => {
    // Given the browser viewport is 375px
    await page.setViewportSize({ width: 375, height: 812 });

    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // Then the step indicator should show only numbered circles and connectors
    await expect(
      page.getByTestId('step-indicator').getByTestId('step-circle-1'),
    ).toBeVisible();
    await expect(
      page.getByTestId('step-indicator').getByTestId('step-circle-2'),
    ).toBeVisible();
    await expect(
      page.getByTestId('step-indicator').getByTestId('step-circle-3'),
    ).toBeVisible();
    await expect(
      page.getByTestId('step-indicator').getByTestId('step-connector-1-2'),
    ).toBeVisible();
    await expect(
      page.getByTestId('step-indicator').getByTestId('step-connector-2-3'),
    ).toBeVisible();

    // And the step labels should not be visible
    await expect(
      page.getByTestId('step-indicator').getByTestId('step-label-1'),
    ).toBeHidden();
    await expect(
      page.getByTestId('step-indicator').getByTestId('step-label-2'),
    ).toBeHidden();
    await expect(
      page.getByTestId('step-indicator').getByTestId('step-label-3'),
    ).toBeHidden();
  });

  test('NDP-03: Filter references by search query matching title', async ({ page }) => {
    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // And I type "NDA Template" into the search input
    await page.getByTestId('filter-row').getByTestId('search-input').fill('NDA Template');

    // Then only references with "NDA" in their title should be visible
    await expect(
      page.getByTestId('reference-list').locator('[data-testid^="reference-item-"]'),
    ).toHaveCount(1);
    await expect(
      page
        .getByTestId('reference-list')
        .locator('[data-testid^="reference-item-"]')
        .first()
        .locator('div > div')
        .first(),
    ).toContainText('NDA');

    // When I type "confidential" into the search input
    await page.getByTestId('filter-row').getByTestId('search-input').fill('confidential');

    // Then only references with "confidential" in their description should be visible
    await expect(
      page.getByTestId('reference-list').locator('[data-testid^="reference-item-"]'),
    ).toHaveCount(1);
    await expect(
      page
        .getByTestId('reference-list')
        .locator('[data-testid^="reference-item-"]')
        .first(),
    ).toContainText('confidential');

    // When I type "nda t" into the search input
    await page.getByTestId('filter-row').getByTestId('search-input').fill('nda t');

    // Then references with "NDA" in their title should be visible
    await expect(
      page.getByTestId('reference-list').locator('[data-testid^="reference-item-"]'),
    ).toHaveCount(1);
    await expect(
      page
        .getByTestId('reference-list')
        .locator('[data-testid^="reference-item-"]')
        .first()
        .locator('div > div')
        .first(),
    ).toContainText('NDA');
  });

  test('NDP-04: Filter references by type', async ({ page }) => {
    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // Then the type filter dropdown should show "All Types"
    await expect(page.getByTestId('filter-row').getByTestId('type-filter')).toContainText(
      'All Types',
    );

    // When I select "Contract" from the type filter dropdown
    await page.getByTestId('filter-row').getByTestId('type-filter').click();
    await page.waitForSelector("[role='option']");
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Contract' }).click();

    // Then only references with type "Contract" should be visible
    await expect(
      page.getByTestId('reference-list').locator('[data-testid^="reference-item-"]'),
    ).toHaveCount(3);

    // When I select "Policy" from the type filter dropdown
    await page.getByTestId('filter-row').getByTestId('type-filter').click();
    await page.waitForSelector("[role='option']");
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Policy' }).click();

    // Then only references with type "Policy" should be visible
    await expect(
      page.getByTestId('reference-list').locator('[data-testid^="reference-item-"]'),
    ).toHaveCount(1);

    // When I select "Employment" from the type filter dropdown
    await page.getByTestId('filter-row').getByTestId('type-filter').click();
    await page.waitForSelector("[role='option']");
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Employment' }).click();

    // Then only references with type "Employment" should be visible
    await expect(
      page.getByTestId('reference-list').locator('[data-testid^="reference-item-"]'),
    ).toHaveCount(1);

    // When I select "All Types" from the type filter dropdown
    await page.getByTestId('filter-row').getByTestId('type-filter').click();
    await page.waitForSelector("[role='option']");
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'All Types' }).click();

    // Then all references should be visible
    await expect(
      page.getByTestId('reference-list').locator('[data-testid^="reference-item-"]'),
    ).toHaveCount(5);
  });

  test('NDP-05: Select a reference by clicking its checkbox', async ({ page }) => {
    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // And I click the checkbox for "NDA Template"
    await page.getByTestId('reference-list').getByRole('checkbox', { name: /NDA Template/ }).click();

    // Then the "NDA Template" row should be selected
    await expect(
      page
        .getByTestId('reference-list')
        .locator('[data-testid^="reference-item-"]', { hasText: 'NDA Template' }),
    ).toHaveAttribute('class', /bg-primary-50/);

    // And the selected panel should show "Selected (1)"
    await expect(page.getByTestId('selected-references-panel')).toContainText('Selected (1)');

    // And the selected panel should list "NDA Template" with its type badge
    await expect(
      page.getByTestId('selected-references-panel').getByTestId('selected-references-list'),
    ).toContainText('NDA Template');
    await expect(
      page.getByTestId('selected-references-panel').getByTestId('selected-references-list'),
    ).toContainText('Contract');

    // When I click the checkbox for "NDA Template" (deselect)
    await page.getByTestId('reference-list').getByRole('checkbox', { name: /NDA Template/ }).click();

    // Then the "NDA Template" row should not be selected
    await expect(
      page
        .getByTestId('reference-list')
        .locator('[data-testid^="reference-item-"]', { hasText: 'NDA Template' }),
    ).not.toHaveAttribute('class', /bg-primary-50/);

    // And the selected panel should show "No references selected"
    await expect(
      page.getByTestId('selected-references-panel').getByTestId('selected-references-empty'),
    ).toContainText('No references selected');

    // When I select the "NDA Template" reference again
    await page.getByTestId('reference-list').getByRole('checkbox', { name: /NDA Template/ }).click();

    // And I click the remove button for "NDA Template" in the selected panel
    await page.getByTestId('selected-references-panel').getByRole('button', { name: 'Remove' }).click();

    // Then "NDA Template" should be removed from the selected panel
    await expect(
      page.getByTestId('selected-references-panel').getByTestId('selected-references-empty'),
    ).toBeVisible();

    // And the "NDA Template" checkbox should be unchecked
    await expect(
      page.getByTestId('reference-list').getByRole('checkbox', { name: /NDA Template/ }),
    ).not.toBeChecked();

    // When I select "NDA Template" and "Service Agreement"
    await page.getByTestId('reference-list').getByRole('checkbox', { name: /NDA Template/ }).click();
    await page
      .getByTestId('reference-list')
      .getByRole('checkbox', { name: /Service Agreement/ })
      .click();

    // Then the selected panel should show "Selected (2)"
    await expect(page.getByTestId('selected-references-panel')).toContainText('Selected (2)');

    // When I deselect "Service Agreement"
    await page
      .getByTestId('reference-list')
      .getByRole('checkbox', { name: /Service Agreement/ })
      .click();

    // Then the selected panel should show "Selected (1)"
    await expect(page.getByTestId('selected-references-panel')).toContainText('Selected (1)');
  });

  test('NDP-06: Next button disabled until reference selected', async ({ page }) => {
    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // Then the "Back" button should be disabled
    await expect(page.getByTestId('footer-bar').getByTestId('back-button')).toBeDisabled();

    // And the "Next" button should be disabled
    await expect(page.getByTestId('footer-bar').getByTestId('next-button')).toBeDisabled();

    // When I select "NDA Template"
    await page.getByTestId('reference-list').getByRole('checkbox', { name: /NDA Template/ }).click();

    // Then the "Next" button should be enabled
    await expect(page.getByTestId('footer-bar').getByTestId('next-button')).toBeEnabled();

    // When I deselect "NDA Template"
    await page.getByTestId('reference-list').getByRole('checkbox', { name: /NDA Template/ }).click();

    // Then the "Next" button should be disabled
    await expect(page.getByTestId('footer-bar').getByTestId('next-button')).toBeDisabled();
  });

  test('NDP-07: Mobile shows collapsible selected summary instead of panel', async ({ page }) => {
    // Given the browser viewport is 375px
    await page.setViewportSize({ width: 375, height: 812 });

    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // Then the selected references panel should not be visible
    await expect(
      page.getByTestId('select-references-step').getByTestId('selected-references-panel'),
    ).toBeHidden();

    // And the two-column layout should be stacked vertically
    const flexDirection = await page
      .getByTestId('select-references-step')
      .evaluate((el) => window.getComputedStyle(el).flexDirection);
    expect(flexDirection).toBe('column');

    // When I select "NDA Template"
    await page
      .getByTestId('reference-list')
      .getByRole('checkbox', { name: /NDA Template/ })
      .click();

    // Then I should see a summary bar showing "1 reference selected"
    await expect(
      page.getByTestId('select-references-step').getByTestId('mobile-selected-summary'),
    ).toContainText('1 reference selected');
  });

  test('NDP-08: Upload file via click-to-browse', async ({ page }) => {
    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // Get initial reference count
    const initialCount = await page
      .getByTestId('reference-list')
      .locator('[data-testid^="reference-item-"]')
      .count();

    // And I click the upload area and select "web/src/documents/docs/NDA Template.pdf"
    await page
      .getByTestId('upload-area')
      .getByTestId('upload-input')
      .setInputFiles(path.resolve(__dirname, 'NDA Template.pdf'));
    await page.waitForLoadState('networkidle');

    // Then the uploaded reference should appear in the reference list
    await expect(
      page.getByTestId('reference-list').locator('[data-testid^="reference-item-"]'),
    ).toHaveCount(initialCount + 1);
    await expect(
      page.getByTestId('reference-list').locator('[data-testid^="reference-item-"]').first(),
    ).toContainText('NDA Template');

    // When I drag and drop the same PDF file onto the upload area
    const pdfBase64 = readFileSync(path.resolve(__dirname, 'NDA Template.pdf')).toString('base64');
    await page.evaluate((base64) => {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const file = new File([bytes.buffer], 'NDA Template.pdf', { type: 'application/pdf' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const uploadArea = document.querySelector('[data-testid="upload-area"]');
      uploadArea.dispatchEvent(new DragEvent('dragenter', { dataTransfer, bubbles: true }));
      uploadArea.dispatchEvent(new DragEvent('dragover', { dataTransfer, bubbles: true }));
      uploadArea.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true }));
    }, pdfBase64);
    await page.waitForLoadState('networkidle');

    // Then the second uploaded reference should appear in the reference list as well
    await expect(
      page.getByTestId('reference-list').locator('[data-testid^="reference-item-"]'),
    ).toHaveCount(initialCount + 2);

    // When I click the upload area again and select "web/src/documents/docs/Empty.docx"
    await page
      .getByTestId('upload-area')
      .getByTestId('upload-input')
      .setInputFiles(path.resolve(__dirname, 'Empty.docx'));
    await page.waitForLoadState('networkidle');

    // Then the file should be rejected
    // And the reference list should not contain the rejected file
    await expect(
      page.getByTestId('reference-list').locator('[data-testid^="reference-item-"]'),
    ).toHaveCount(initialCount + 2);
  });

  test('NDP-09: Display context step with selected references summary', async ({ page }) => {
    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // And I select the "NDA Template" reference
    await page.getByTestId('reference-list').getByRole('checkbox', { name: /NDA Template/ }).first().click();

    // And I click the "Next" button
    await page.getByTestId('footer-bar').getByTestId('next-button').click();

    // Then I should see a summary card showing the selected reference count and titles
    await expect(page.getByTestId('provide-context-step').getByTestId('references-summary')).toContainText(
      'Using 1 reference:',
    );
    await expect(page.getByTestId('provide-context-step').getByTestId('references-summary')).toContainText(
      'NDA Template',
    );

    // And I should see a label "Describe what you need"
    await expect(
      page.getByTestId('provide-context-step').getByText('Describe what you need'),
    ).toBeVisible();

    // And I should see a helper text with guidance for the context textarea
    await expect(
      page
        .getByTestId('provide-context-step')
        .getByText('Include the parties, purpose, specific terms, and any questions you want addressed.'),
    ).toBeVisible();

    // And the "Generate Document" button should be disabled
    await expect(page.getByTestId('footer-bar').getByTestId('generate-button')).toBeDisabled();

    // When I type "Create an NDA" into the context textarea
    await page.getByTestId('provide-context-step').getByTestId('context-textarea').fill('Create an NDA');

    // Then the "Generate Document" button should be enabled
    await expect(page.getByTestId('footer-bar').getByTestId('generate-button')).toBeEnabled();

    // And the textarea should contain the typed text
    await expect(
      page.getByTestId('provide-context-step').getByTestId('context-textarea'),
    ).toHaveValue('Create an NDA');

    // When I clear the context textarea
    await page.getByTestId('provide-context-step').getByTestId('context-textarea').fill('');

    // Then the "Generate Document" button should be disabled
    await expect(page.getByTestId('footer-bar').getByTestId('generate-button')).toBeDisabled();
  });

  test('NDP-10: Generation progresses through phases via SSE @timeout-600s', async ({ page }) => {
    // @timeout-600s - Extend timeout for SSE generation
    test.setTimeout(600_000);

    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');
    await page.waitForLoadState('networkidle');

    // And I select the "NDA Template" reference
    await page.getByTestId('reference-list').getByRole('checkbox', { name: /NDA Template/ }).click();

    // And I click the "Next" button
    await page.getByTestId('next-button').click();

    // And I type "Between TechCorp and DataFlow Inc, 12-month term, covers shared API data" into the context textarea
    await page.getByTestId('context-textarea').fill('Between TechCorp and DataFlow Inc, 12-month term, covers shared API data');

    // And I click the "Generate Document" button
    await page.getByTestId('generate-button').click();

    // Then I should be on step 3
    await expect(page.getByTestId('step-indicator').getByTestId('step-circle-3')).toHaveAttribute(
      'aria-current',
      'step',
    );

    // And the "Save" button should be disabled
    await expect(page.getByTestId('save-button')).toBeDisabled();

    // And the "Export PDF" button should be disabled
    await expect(page.getByTestId('export-pdf-button')).toBeDisabled();

    // And I should see the phase progress indicator
    await expect(page.getByTestId('phase-progress')).toBeVisible();

    // And the "Analyzing references" phase should become active with a spinner
    await expect(
      page.getByTestId('phase-item-analyzing').getByTestId('phase-icon-spinner'),
    ).toBeVisible({ timeout: 600_000 });

    // And the "Analyzing references" phase should complete with a checkmark
    await expect(
      page.getByTestId('phase-item-analyzing').getByTestId('phase-icon-check'),
    ).toBeVisible({ timeout: 600_000 });

    // And the "Structuring document" phase should become active
    await expect(
      page.getByTestId('phase-item-structuring').getByTestId('phase-icon-spinner'),
    ).toBeVisible({ timeout: 600_000 });

    // And the "Structuring document" phase should complete
    await expect(
      page.getByTestId('phase-item-structuring').getByTestId('phase-icon-check'),
    ).toBeVisible({ timeout: 600_000 });

    // And the "Drafting sections" phase should become active
    await expect(
      page.getByTestId('phase-item-drafting').getByTestId('phase-icon-spinner'),
    ).toBeVisible({ timeout: 600_000 });

    // And the "Drafting sections" phase should complete
    await expect(
      page.getByTestId('phase-item-drafting').getByTestId('phase-icon-check'),
    ).toBeVisible({ timeout: 600_000 });

    // And the "Finalizing" phase should become active
    await expect(
      page.getByTestId('phase-item-finalizing').getByTestId('phase-icon-spinner'),
    ).toBeVisible({ timeout: 600_000 });

    // And the "Finalizing" phase should complete
    await expect(
      page.getByTestId('phase-item-finalizing').getByTestId('phase-icon-check'),
    ).toBeVisible({ timeout: 600_000 });

    // And all four phases should show checkmarks
    await expect(
      page.getByTestId('phase-progress').locator('[data-testid="phase-icon-check"]'),
    ).toHaveCount(4);

    // And the PDF viewer should render the generated document
    await expect(page.getByTestId('doc-viewer-wrap')).toBeVisible();

    // When I click the "Export PDF" button
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByTestId('export-pdf-button').click(),
    ]);

    // Then a PDF file should be downloaded via the browser
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);

    // When I click the "Save" button
    await page.getByTestId('save-button').click();

    // Then the document status should be updated to "Done"
    // And the browser URL should match "/documents/:id"
    await page.waitForURL(/\/documents\/[a-f0-9]{24}/);
    await expect(page).toHaveURL(/\/documents\/[a-f0-9]{24}/);

    // And I should see the document detail page
    await expect(page.getByTestId('detail-header')).toBeVisible();

    // Capture document ID before navigating away
    const docId = page.url().match(/\/documents\/([a-f0-9]{24})/)?.[1];

    // When I click "Documents" in the sidebar navigation
    await page.getByTestId('sidebar-nav').getByRole('link', { name: 'Documents' }).click();

    // Then I should see the documents page
    await expect(page.getByRole('heading', { name: 'Documents', level: 1 })).toBeVisible();

    // And I should see a document card linking to "/documents/:id"
    await expect(page.locator(`a[href="/documents/${docId}"]`)).toBeVisible();
  });
});
