As a user, I want to view a document's details and its PDF content so that I can review the full legal document.

## Requirements

- Display document detail page at route `/documents/:id` with title, type badge, creation date, and a centered document viewer.
- Sticky action bar with "Back to Documents" link and "Export PDF" button. Export PDF triggers a browser download of the PDF file from `GET /v1/documents/{id}/pdf`.
- Store PDF file content as binary in the MongoDB document model.
- Render the stored PDF in the document viewer area using `react-pdf` for cross-browser and mobile support.
- Responsive layout: sidebar collapses on mobile, document viewer padding reduces from 48px to 24px.
- Update seed data to include sample PDF files for existing documents.
- Follow the layout from `docs/document-detail-layout.md` and styling from `docs/document-detail-ui-design.html`.

## Tasks

**Parallel tasks 1-7:**

1. Use backend-developer subagent to add a `pdf_content` bytes field to the document model @api/models/document.py.
2. Use backend-developer subagent to add `DocumentDetailData` and `DocumentDetailResponse` schemas @api/schemas/document.py. `DocumentDetailData` wraps the existing `DocumentResponse`. `DocumentDetailResponse` follows the standard `{ data, error }` envelope.
3. Use frontend-developer subagent to create document detail store @web/src/stores/document-detail-store.js. Add `fetchDocument(id)` action that calls `GET /v1/documents/{id}`. Store document metadata keyed by ID to avoid duplicates across navigations.
4. Use frontend-developer subagent to install `react-pdf` and `pdfjs-dist` @web/package.json. Configure the PDF.js worker in @web/src/components/app.jsx.
5. Use frontend-developer subagent to create loading skeleton component @web/src/documents/components/document-detail-skeleton.jsx. Follow the skeleton structure from `docs/document-detail-loading-ui-design.html`. Use the `Skeleton` component from @web/src/shadcn/ui/skeleton.jsx, following the same pattern as @web/src/documents/components/skeleton-grid.jsx. Render the skeleton from the document detail page component while the document detail store is loading.
6. Use frontend-developer subagent to add i18n keys @web/src/i18n/en.json. Add keys: `documents.backToDocuments`, `documents.exportPdf`, `documents.created`.
7. Use qa-tester subagent to plan BDD scenarios @docs/document-detail.feature.

**Sequential tasks 8-9 after tasks 1-2 complete:**

8. Use backend-developer subagent to add `GET /v1/documents/{id}` endpoint @api/routes/v1/endpoints/documents.py. Return document detail with metadata. Return 404 if not found.
9. Use backend-developer subagent to add `GET /v1/documents/{id}/pdf` endpoint @api/routes/v1/endpoints/documents.py. Return the stored PDF binary as `application/pdf` response. Return 404 if not found.

**Sequential task 10 after task 1 completes:**

10. Use backend-developer subagent to update seed data @api/db/seed.py. Generate sample PDF files using `reportlab` for each seeded document with realistic legal content matching their titles. Add `reportlab` to @api/pyproject.toml dependencies.

**Sequential tasks 11-12 after tasks 3-5 complete:**

11. Use frontend-developer subagent to create document detail page component @web/src/documents/components/document-detail.jsx. Implement sticky action bar with back link and Export PDF button, title with type badge and date, and PDF viewer using `react-pdf` `Document` and `Page` components with the URL `{apiBaseUrl}/v1/documents/{id}/pdf`. Follow layout from `docs/document-detail-layout.md` and styling from `docs/document-detail-ui-design.html`. Reference `docs/style-guide.html` for design tokens.
12. Use frontend-developer subagent to update app routing @web/src/components/app.jsx. Replace the placeholder `DocumentDetail` with a lazy-loaded import of the new document detail component.
