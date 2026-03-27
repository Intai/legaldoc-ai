# LegalDoc AI -- Documents Layout

ASCII wireframe layouts for the Documents views. Wireframes use monospace box-drawing
to show structure, proportions, and information hierarchy.

---

## Shared App Shell

```
+------------------+---------------------------------------------------------+
|                  |  TOPBAR (56px height)                                   |
|  SIDEBAR (240px) |  [Search icon] [Search input, 280px]          [Avatar]  |
|                  |                                                         |
|  LegalDoc AI     +---------------------------------------------------------+
|                  |                                                         |
|  [icon] Documents|  CONTENT AREA                                           |
|  [icon] New Doc  |  (flex: 1, padding 24px)                                |
|                  |                                                         |
|                  |  Scrollable region.                                     |
|                  |  Each view renders here.                                |
|                  |                                                         |
|                  |                                                         |
|                  |                                                         |
|                  |                                                         |
+------------------+---------------------------------------------------------+
```

**Annotations**

- Sidebar is fixed at 240px with `bg-sidebar` (#f4f5f7), border-right.
- Logo "LegalDoc AI" sits at the top of the sidebar with bold primary-800 text.
- Nav items use `sidebar-item` pattern: icon + label, 14px medium weight.
- Active nav item gets `bg-sidebar-active` (#eef3f8) and primary-700 text.
- Topbar is 56px tall, white background, border-bottom.
- Search input is 280px wide on the left side of the topbar.
- User avatar (32px circle) sits on the right side of the topbar.
- Content area fills remaining space, has 24px padding and vertical scroll.

### Mobile App Shell (<768px)

```
+---------------------------------------------+
|  [≡]  [Search input, flex: 1]         [JD]  |
+---------------------------------------------+
|                                             |
|  CONTENT AREA                               |
|  (flex: 1, padding 16px)                    |
|                                             |
|  Scrollable region.                         |
|  Each view renders here.                    |
|  Full width, single column.                 |
|                                             |
|                                             |
+---------------------------------------------+
```

### Mobile App Shell — Sidebar Open

```
+---------------------------------------------+
|  [≡]  [Search input, flex: 1]         [JD]  |
+------------------+--------------------------+
|                  |//////////////////////////|
|  LegalDoc AI     |//////////////////////////|
|                  |//  OVERLAY               |
|  [icon] Documents|//  (bg-overlay)          |
|  [icon] New Doc  |//                        |
|                  |//  Tap to close sidebar. |
|                  |//                        |
|  SIDEBAR (240px) |//////////////////////////|
|                  |//////////////////////////|
+------------------+--------------------------+
```

**Annotations (Mobile)**

- Sidebar is hidden off-screen by default. A hamburger icon (`≡`) in the topbar toggles it.
- When open, the sidebar slides in from the left at 240px width, overlaying the content.
- A semi-transparent overlay (`bg-overlay`, rgba(10, 12, 15, 0.5)) covers the content area.
  Tapping the overlay closes the sidebar.
- Topbar remains at 56px height.
- The hamburger icon sits on the left.
- Page title is omitted from the topbar (redundant with the in-page H1).
- Search input remains visible, expanding to fill available space (`flex: 1`).
- User avatar (32px circle) remains on the right.
- Content area padding reduces from 24px to 16px.

---

## Documents (Home)

Active nav: **Documents**

```
+------------------+------------------------------------------------------------------------------------------------+
|                  |  [Search icon] [Search............]                                                  [JD]      |
|  LegalDoc AI     +------------------------------------------------------------------------------------------------+
|                  |                                                                                                |
| >Documents       |  Documents                                                                       (page title)  |
|  New Document    |                                                                                                |
|                  |  [Sort: Most Recent v]  [Type: All Types v]                                       (controls)   |
|                  |                                                                                                |
|                  |  +--card-grid: auto-fill, minmax(300px, 1fr)------------------------------------------------+  |
|                  |  |                                                                                          |  |
|                  |  |  +---------------------------+ +---------------------------+ +---------------------------+  |
|                  |  |  | NDA                  Done | | Employment          Draft | | Service             Draft |  |
|                  |  |  |                           | |                           | |                           |  |
|                  |  |  | This Non-Disclosure       | | This Employment Agreement | | This Service Agreement    |  |
|                  |  |  | Agreement is entered...   | | is entered into between.. | | is entered into betw..    |  |
|                  |  |  |                           | |                           | |                           |  |
|                  |  |  | [NDA]  Mar 25, 2026  3 pg | | [Employment]  Mar 20  5 pg| | [Contract]  Mar 18  2 pg  |  |
|                  |  |  +---------------------------+ +---------------------------+ +---------------------------+  |
|                  |  |                                                                                          |  |
|                  |  |  +---------------------------+ +---------------------------+ +---------------------------+  |
|                  |  |  | Privacy       Generating  | | Vendor                Done| | Lease               Draft |  |
|                  |  |  |                           | |                           | |                           |  |
|                  |  |  | This Privacy Policy       | | This Vendor Agreement is  | | This Lease Agreement      |  |
|                  |  |  | covers data collection..  | | entered into between...   | | is entered into betw..    |  |
|                  |  |  |                           | |                           | |                           |  |
|                  |  |  | [Policy]  Mar 15, 2026  - | | [Contract]  Mar 10  4 pg  | | [Contract]  Mar 5  1 pg   |  |
|                  |  |  +---------------------------+ +---------------------------+ +---------------------------+  |
|                  |  |                                                                                          |  |
|                  |  +------------------------------------------------------------------------------------------+  |
+------------------+------------------------------------------------------------------------------------------------+
```

**Card anatomy (each cell in the grid)**

```
+---------------------------------------------+
|  Service Agreement          Draft  (title   |
|                                   + status) |
|                                             |
|  This Service Agreement is entered into     |
|  between Acme Corp and...          (2-line  |
|                                   snippet)  |
|                                             |
|  [Contract]  Mar 18, 2026  2 pg (meta row)  |
+---------------------------------------------+
```

**Annotations**

- Page title "Documents" is H1 (30px, semibold).
- Controls row sits below the title with 16px gap.
  - Sort dropdown: "Most Recent" / "A-Z" options.
  - Type filter dropdown: "All Types" / "Contract" / "Policy" / "Employment" etc.
- Card grid uses `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`.
  - At wide viewports: 3 columns. At medium: 2 columns. At narrow: 1 column.
- Each card uses the `card` component: white bg, border, 8px radius, 20px padding.
- Card title row: title (16px semibold) + status badge, flex space-between.
  - Status badge uses color variants: `badge-success` for Complete, `badge-warning`
    for Draft, `badge-primary` for Generating.
- Card description: 2-line clamp snippet (14px, neutral-500).
- Card meta row (bottom): type badge + date + page count (12px, neutral-400).
  - Type badge uses `badge-default` for all document types (NDA, Contract, Policy, etc.).
- Entire card is clickable, navigating to the document detail view.
- Hover state: `shadow-md` + stronger border.

---

## Responsive Notes

At viewports narrower than 768px (see **Mobile App Shell** wireframes above):

- Sidebar collapses behind a hamburger menu icon in the topbar.
- Search input stays visible, fills available space.
- Content area padding reduces from 24px to 16px.
- Document card grid collapses to 1 column.
