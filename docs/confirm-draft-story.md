As a user, I want to confirm a draft document so that its status changes from "Draft" to "Done".

## Requirements

- Add document status constants (`STATUS_DONE`, `STATUS_DRAFT`, `STATUS_GENERATING`) to the shared constants file.
- Add a `confirmDraft` action to the document detail store that calls `PUT /v1/documents/{id}/status` with `{ status: "Done" }` and updates the cached document.
- Support `{ refresh: true }` option in the documents store `fetchDocuments` action, re-fetching with `Math.max(documents.length, 6)` as the limit.
- Display a "Confirm Draft" button in the document detail action bar, only when the document status is "Draft".
- The "Confirm Draft" button is disabled while the save request is in progress.
- After a successful confirm, refresh the documents list cache via `fetchDocuments({ refresh: true })`.
- When both buttons are rendered, the export button label is hidden on mobile (matching the responsive pattern in `review-save-step.jsx`).

## Tasks

**Parallel tasks 1-4:**

1. Use frontend-developer subagent to add document status constants @web/src/constants.js. Export `STATUS_DONE = 'Done'`, `STATUS_DRAFT = 'Draft'`, `STATUS_GENERATING = 'Generating'`.
2. Use frontend-developer subagent to support `{ refresh: true }` option in `fetchDocuments` @web/src/stores/documents-store.js. When `refresh` is true, use `Math.max(documents.length, 6)` as the limit instead of hardcoded `6`.
3. Use frontend-developer subagent to add translation key `"confirmDraftButton": "Confirm Draft"` to the `documents` section in @web/src/i18n/en.json.
4. Use qa-tester subagent to plan BDD scenarios @web/src/documents/docs/confirm-draft.feature.

**Sequential task 5 after task 1 completes:**

5. Use frontend-developer subagent to add `confirmDraft` action and `saving` state to @web/src/stores/document-detail-store.js. Import `fetchPut` from @web/src/utils/api.js and `STATUS_DONE` from @web/src/constants.js. Follow the `saveDocument` pattern in @web/src/stores/new-document-store.js. Update the cached document in the store with the response `data` from the PUT request.

**Sequential task 6 after tasks 2, 5 complete:**

6. Use frontend-developer subagent to add "Confirm Draft" button to @web/src/documents/components/document-detail.jsx. Import `CircleCheck` from `lucide-react`, `STATUS_DRAFT` from @web/src/constants.js, and `useDocumentsStore` from @web/src/stores/documents-store.js. Show button only when `document.status === STATUS_DRAFT`. Disable while `saving`. On success, call `useDocumentsStore.getState().fetchDocuments({ refresh: true })`. Wrap both buttons in `flex items-center gap-2`. Hide export button label on mobile with `max-md:hidden` when confirm button is rendered. Reference @web/src/documents/components/review-save-step.jsx for button layout pattern.
