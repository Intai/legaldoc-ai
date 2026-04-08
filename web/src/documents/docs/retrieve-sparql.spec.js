import { expect, test } from '@playwright/test';
import { execSync } from 'child_process';

// ============================================================
// Helper Functions
// ============================================================

async function waitForQdrantNotEmpty() {
  for (let i = 0; i < 120; i++) {
    const res = await fetch(
      'http://localhost:6333/collections/legal_documents/points/count',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    );
    const data = await res.json();
    if (data.result.count > 0) return data.result.count;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Qdrant still empty after 600s');
}

// ============================================================
// Test Suite
// ============================================================

test.describe('Feature: SPARQL-based EU Regulation Cross-referencing', () => {
  test('RS-01 - Answer references regulation text when query mentions EU regulation @purge-data @timeout-600s', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    // @purge-data - Restore the seed data to initial state
    execSync('make reseed', { stdio: 'inherit', cwd: '..' });

    // When I navigate to the new document page at "/documents/new"
    await page.goto('http://localhost:8080/documents/new');

    // And I select the "NDA Template" reference
    await page.getByTestId('reference-list').getByText('NDA Template').first().click();

    // And I click the "Next" button
    await page.getByTestId('next-button').click();

    // And I type "Between TechCorp and DataFlow Inc, 12-month term, covers shared API data" into the context textarea
    await page.getByTestId('context-textarea').fill(
      'Between TechCorp and DataFlow Inc, 12-month term, covers shared API data',
    );

    // And I click the "Generate Document" button
    await page.getByTestId('generate-button').click();

    // Then I should be on step 3
    await expect(page.getByTestId('step-circle-3')).toContainText('3');

    // And all four phases should complete with checkmarks
    await expect(
      page.getByTestId('phase-progress').getByTestId('phase-icon-check'),
    ).toHaveCount(4, { timeout: 600_000 });

    // When I wait until Qdrant is not empty
    await waitForQdrantNotEmpty();

    // And I type "What clauses should I include in a non-disclosure agreement to comply with GDPR right to erasure?" into the assistant input
    await page.getByTestId('assistant-input').fill(
      'What clauses should I include in a non-disclosure agreement to comply with GDPR right to erasure?',
    );

    // And I press "Enter" on the assistant input
    await page.keyboard.press('Enter');

    // Then the assistant panel should appear below the assistant input
    await expect(page.getByTestId('assistant-panel')).toBeVisible({
      timeout: 600_000,
    });

    // And the answer text should be displayed in the panel
    await expect(page.getByTestId('assistant-answer')).toBeVisible({
      timeout: 600_000,
    });

    // And the answer text should reference regulation content or compliance language
    await expect(page.getByTestId('assistant-answer')).toContainText(
      /erasure|GDPR|compliance|personal data/i,
      { timeout: 600_000 },
    );

    // And I should see a "Sources" section below the answer
    await expect(page.getByTestId('assistant-sources')).toBeVisible();

    // And the first source should display a document icon
    await expect(
      page.getByTestId('assistant-source-icon').first(),
    ).toBeVisible();

    // And the first source should display the document title
    await expect(
      page.getByTestId('assistant-source-title').first(),
    ).toBeVisible();
  });

  test('RS-02 - Answer incorporates multiple regulation references from query @timeout-600s', async ({
    page,
  }) => {
    test.setTimeout(600_000);

    // When I wait until Qdrant is not empty
    await waitForQdrantNotEmpty();

    // And I type "What clauses should I include in a non-disclosure agreement to comply with GDPR right to be forgotten and ePrivacy Article 5?" into the assistant input
    await page.goto('http://localhost:8080/documents');
    await page.getByTestId('assistant-input').fill(
      'What clauses should I include in a non-disclosure agreement to comply with GDPR right to be forgotten and ePrivacy Article 5?',
    );

    // And I press "Enter" on the assistant input
    await page.keyboard.press('Enter');

    // Then the assistant panel should appear below the assistant input
    await expect(page.getByTestId('assistant-panel')).toBeVisible({
      timeout: 600_000,
    });

    // And the answer text should be displayed in the panel
    await expect(page.getByTestId('assistant-answer')).toBeVisible({
      timeout: 600_000,
    });

    // And the answer text should reference regulation content or compliance language
    await expect(page.getByTestId('assistant-answer')).toContainText(
      /erasure|GDPR|compliance|personal data|ePrivacy/i,
      { timeout: 600_000 },
    );

    // And I should see a "Sources" section below the answer
    await expect(page.getByTestId('assistant-sources')).toBeVisible();
  });
});
