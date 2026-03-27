# LegalDoc AI -- Document Detail Layout

ASCII wireframe layout for the Document Detail view. See
[documents-layout.md](documents-layout.md) for the Shared App Shell.

---

## Document Detail

Active nav: **Documents** (this is a sub-view)

```
+------------------+----------------------------------------------------------+
|                  |  [Search icon] [Search............]              [JD]    |
|  LegalDoc AI     +----------------------------------------------------------+
|                  |                                                          |
| >Documents       |  [<- Back to Documents]                    [Export PDF]  |
|  New Document    |  ------------------------------------------------------- |
|                  |                                                          |
|                  |  Non-Disclosure Agreement         (doc title, H1, 30px)  |
|                  |  [Contract]  Created Mar 25, 2026     (badge + date)     |
|                  |                                                          |
|                  |  +--doc-viewer (max-w 720px, centered)----------------+  |
|                  |  |                                                    |  |
|                  |  |        NON-DISCLOSURE AGREEMENT                    |  |
|                  |  |        ────────────────────────                    |  |
|                  |  |                                                    |  |
|                  |  |  This Non-Disclosure Agreement ("Agreement")       |  |
|                  |  |  is entered into as of March 25, 2026...           |  |
|                  |  |                                                    |  |
|                  |  |  1. DEFINITIONS                                    |  |
|                  |  |     "Confidential Information" means any data      |  |
|                  |  |     or information, oral or written...             |  |
|                  |  |                                                    |  |
|                  |  |  2. OBLIGATIONS                                    |  |
|                  |  |     The Receiving Party shall hold and maintain    |  |
|                  |  |     the Confidential Information in strict...      |  |
|                  |  |                                                    |  |
|                  |  |  3. TERM                                           |  |
|                  |  |     This Agreement shall remain in effect for      |  |
|                  |  |     a period of two (2) years...                   |  |
|                  |  |                                                    |  |
|                  |  |  _______________      _______________              |  |
|                  |  |  Disclosing Party     Receiving Party              |  |
|                  |  |                                                    |  |
|                  |  +----------------------------------------------------+  |
+------------------+----------------------------------------------------------+
```

**Annotations**

- Action bar: sticky row at the top of the content area (`position: sticky; top: 0`).
  - Back link on the left: arrow icon + "Back to Documents" text, 14px, neutral-600, clickable.
  - Export PDF button on the right: secondary style.
  - Bottom border separator, white background, z-10.
- Title row: document title as H1 (30px semibold).
- Meta row below title: type badge + creation date (14px, neutral-500).
- Document viewer (`doc-viewer`): white background, border, shadow-md, 8px radius.
  - Max-width 720px, horizontally centered with `margin: 0 auto`.
  - Padding: 48px horizontal, 48px vertical.
  - Uses serif font (`Georgia, 'Times New Roman', serif`) per design system.
  - H1 in viewer: uppercase, centered, bold, bottom border.
  - H2 section headers: bold, margin-top 32px.
  - Body text: justified, 17px, line-height 1.7.
  - Clause numbers: bold inline prefix (e.g. "1.", "2.").
  - Signature block: 2-column grid at the bottom.
- Content area scrolls vertically if the document is long.

---

## Responsive Notes

At viewports narrower than 768px:

- Sidebar collapses behind a hamburger menu icon in the topbar.
- Document viewer padding reduces from 48px to 24px.
