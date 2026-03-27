# LegalDoc AI -- New Document Layout

ASCII wireframe layouts for the 3-step New Document flow. See
[documents-layout.md](documents-layout.md) for the Shared App Shell.

---

## Step 1: Select References

Active nav: **New Document**

```
+------------------+-------------------------------------------------------------------------------------+
|                  |  [Search icon] [Search............]                                        [JD]     |
|  LegalDoc AI     +-------------------------------------------------------------------------------------+
|                  |                                                                                     |
|  Documents       |  STEP INDICATOR                                                                     |
| >New Document    |  (1) Select References ----------- (2) Provide Context ---------- (3) Review & Save |
|                  |       [active]                          [upcoming]                     [upcoming]   |
|                  |                                                                                     |
|                  |  +-- Upload area (dashed border, full width) ----------------------------------+    |
|                  |  |                                                                             |    |
|                  |  |  [Upload icon]                                                              |    |
|                  |  |  Drag & drop files here, or click to browse                                 |    |
|                  |  |  PDF, TXT supported                                                         |    |
|                  |  |                                                                             |    |
|                  |  +-----------------------------------------------------------------------------+    |
|                  |                                                                                     |
|                  |  [Search references...]                              [Type: All Types v]            |
|                  |                                                                                     |
|                  |  +-- Reference List (flex: 1) ----------------------+ +-- Selected (280px) ------+  |
|                  |  |                                                  | |                          |  |
|                  |  |  [x] NDA Template                                | |  Selected (2)            |  |
|                  |  |      This template covers standard NDA terms...  | |                          |  |
|                  |  |      [Contract]  Mar 20                          | |  * NDA Template          |  |
|                  |  |                                                  | |    [Contract]            |  |
|                  |  |  [x] Service Agreement                           | |                          |  |
|                  |  |      Standard service terms and conditions...    | |  * Service Agreement     |  |
|                  |  |      [Contract]  Mar 15                          | |    [Contract]            |  |
|                  |  |                                                  | |                          |  |
|                  |  |  [ ] Privacy Policy Template                     | |                          |  |
|                  |  |      Privacy policy for data collection and...   | |                          |  |
|                  |  |      [Policy]    Mar 10                          | |                          |  |
|                  |  |                                                  | |                          |  |
|                  |  |  [ ] Employment Handbook                         | |                          |  |
|                  |  |      Company employment policies and terms...    | |                          |  |
|                  |  |      [Employment] Feb 28                         | |                          |  |
|                  |  |                                                  | |                          |  |
|                  |  |  [ ] Vendor Agreement                            | |                          |  |
|                  |  |      Vendor terms and conditions for...          | |                          |  |
|                  |  |      [Contract]  Feb 20                          | |                          |  |
|                  |  |                                                  | |                          |  |
|                  |  +--------------------------------------------------+ +--------------------------+  |
|                  |                                                                                     |
|                  |  +-- Footer bar (border-top) ----------------------------------------------------+  |
|                  |  |  [Back (disabled)]                                                 [Next ->]  |  |
|                  |  +-------------------------------------------------------------------------------+  |
+------------------+-------------------------------------------------------------------------------------+
```

**Step indicator detail**

```
(1)  Select References  ─────────  (2)  Provide Context  ─────────  (3)  Review & Save
 ^                                  ^                                 ^
active circle:                   upcoming circle:                  upcoming circle:
primary-100 bg                   neutral-100 bg                    neutral-100 bg
primary-400 border               neutral border                    neutral border
bold label                       muted label                       muted label
```

**Annotations**

- Step indicator uses the `steps` component from the style guide.
  - Step 1: `is-active` state (bordered circle, bold label).
  - Steps 2 and 3: `is-upcoming` state (muted circle and label).
  - Connectors between steps: 40px lines, default border color.
- Upload area: dashed border (2px, neutral-300), centered content, 40px vertical
  padding. Upload icon, primary text, secondary helper text.
  - On drag-over: border color changes to primary-400, subtle bg tint.
- Below upload: search input + type filter dropdown in a row.
- Two-column layout below the filters:
  - Left: reference list, `flex: 1`. Scrollable if many items.
  - Right: selected references panel, fixed 280px width.
  - Gap: 16px between columns.
- Reference list items: each item is a row with:
  - Checkbox on the left.
  - Name (16px semibold), preview snippet (14px, 1-line), badge + date (12px meta row).
  - Checked items get a subtle primary-50 background highlight.
  - Items separated by border-bottom (1px, neutral-100).
- Selected panel: header "Selected (N)" with count.
  - Lists selected reference names with their badges.
  - Each item has a remove (x) button on hover.
- Footer bar: sticky at the bottom of the content area, border-top, 16px padding.
  - Back button: secondary style, disabled state (opacity 0.5, no cursor).
  - Next button: primary style, right-aligned. Disabled until at least 1 reference
    is selected.

---

## Step 2: Provide Context

Active nav: **New Document**

```
+------------------+---------------------------------------------------------------------------------------+
|                  |  [Search icon] [Search............]                                           [JD]    |
|  LegalDoc AI     +---------------------------------------------------------------------------------------+
|                  |                                                                                       |
|  Documents       |  STEP INDICATOR                                                                       |
| >New Document    |  (/) Select References ----------- (2) Provide Context ----------- (3) Review & Save  |
|                  |       [complete]                        [active]                        [upcoming]    |
|                  |                                                                                       |
|                  |  +-- Selected references summary --------------------------+                          |
|                  |  |  Using 2 references:                                    |                          |
|                  |  |  * NDA Template [Contract]                               |                         |
|                  |  |  * Service Agreement [Contract]                          |                         |
|                  |  +----------------------------------------------------------+                         |
|                  |                                                                                       |
|                  |  Describe what you need                                                   (label)     |
|                  |  +-- Textarea (full width, min-h 200px) -------------------------------------------+  |
|                  |  |                                                                                 |  |
|                  |  |  I need a non-disclosure agreement between Acme Corp (disclosing party)         |  |
|                  |  |  and Widget Inc (receiving party). The agreement should cover proprietary       |  |
|                  |  |  software designs and trade secrets. Term should be 2 years. Include a          |  |
|                  |  |  non-compete clause for 12 months after termination.                            |  |
|                  |  |                                                                                 |  |
|                  |  |                                                                                 |  |
|                  |  |                                                                                 |  |
|                  |  |                                                                                 |  |
|                  |  +---------------------------------------------------------------------------------+  |
|                  |                                                                                       |
|                  |  +-- Footer bar (border-top) ------------------------------------------------------+  |
|                  |  |  [<- Back]                                              [Generate Document ->]  |  |
|                  |  +---------------------------------------------------------------------------------+  |
+------------------+---------------------------------------------------------------------------------------+
```

**Annotations**

- Step indicator: Step 1 shows `is-complete` state (filled primary-700 circle with
  checkmark icon, primary-colored label). Step 2 is `is-active`. Step 3 is `is-upcoming`.
  Connector between steps 1 and 2 uses primary-300 to show progress.
- Selected references summary: a subtle card (neutral-50 background, border, 12px
  radius). Shows count and lists reference names with their type badges. Clicking
  a reference name could navigate back to Step 1.
- Label "Describe what you need" above the textarea (14px, semibold, neutral-700).
  Optional helper text below the label: "Include the parties, purpose, specific
  terms, and any questions you want addressed."
- Textarea: full width, minimum height 200px, resizable vertically. Uses the `input`
  styles with focus ring (border-focus: primary-400).
- Footer bar: same sticky pattern as Step 1.
  - Back button: secondary, enabled, navigates to Step 1.
  - Generate Document button: primary style, prominent. This is the key CTA.
    Disabled if textarea is empty.

---

## Step 3: Review & Save

Active nav: **New Document**

```
+------------------+---------------------------------------------------------------------------------------+
|                  |  [Search icon] [Search............]                                           [JD]    |
|  LegalDoc AI     +---------------------------------------------------------------------------------------+
|                  |                                                                                       |
|  Documents       |  STEP INDICATOR                                                                       |
| >New Document    |  (/) Select References ----------- (/) Provide Context ----------- (/) Review & Save  |
|                  |       [complete]                        [complete]                      [complete]    |
|                  |                                                                                       |
|                  |  +-- Phase progress (all complete) ------------------------------------------------+  |
|                  |  |  [/] Analyzing references                                                       |  |
|                  |  |  [/] Structuring document                                                       |  |
|                  |  |  [/] Drafting sections                                                          |  |
|                  |  |  [/] Finalizing                                                                 |  |
|                  |  +---------------------------------------------------------------------------------+  |
|                  |                                                                                       |
|                  |  +-- doc-viewer (max-w 720px, centered) -------------------------------------------+  |
|                  |  |                                                                                 |  |
|                  |  |              NON-DISCLOSURE AGREEMENT                                           |  |
|                  |  |              ────────────────────────                                           |  |
|                  |  |                                                                                 |  |
|                  |  |  This Non-Disclosure Agreement ("Agreement") is entered into as of              |  |
|                  |  |  March 25, 2026, by and between Acme Corp ("Disclosing Party") and              |  |
|                  |  |  Widget Inc ("Receiving Party")...                                              |  |
|                  |  |                                                                                 |  |
|                  |  |  1. DEFINITIONS                                                                 |  |
|                  |  |     "Confidential Information" means any data or information, oral              |  |
|                  |  |     or written, that is designated as confidential...                           |  |
|                  |  |                                                                                 |  |
|                  |  |  2. OBLIGATIONS                                                                 |  |
|                  |  |     The Receiving Party shall hold and maintain the Confidential                |  |
|                  |  |     Information of the Disclosing Party in strict confidence...                 |  |
|                  |  |                                                                                 |  |
|                  |  |  3. NON-COMPETE                                                                 |  |
|                  |  |     For a period of twelve (12) months following termination of                 |  |
|                  |  |     this Agreement...                                                           |  |
|                  |  |                                                                                 |  |
|                  |  |  4. TERM                                                                        |  |
|                  |  |     This Agreement shall remain in effect for a period of two (2)               |  |
|                  |  |     years from the date first written above...                                  |  |
|                  |  |                                                                                 |  |
|                  |  |  _______________          _______________                                       |  |
|                  |  |  Disclosing Party         Receiving Party                                       |  |
|                  |  |                                                                                 |  |
|                  |  +---------------------------------------------------------------------------------+  |
|                  |                                                                                       |
|                  |  +-- Action bar (border-top) ------------------------------------------------------+  |
|                  |  |  [<- Back]                                           [Save]    [Export PDF]     |  |
|                  |  +---------------------------------------------------------------------------------+  |
+------------------+---------------------------------------------------------------------------------------+
```

**Phase progress detail (during generation)**

```
+---------------------------------------------------------------------------+
|  [/] Analyzing references                     (success-700, checkmark)    |
|  [/] Structuring document                     (success-700, checkmark)    |
|  [*] Drafting sections...                     (primary-500, spinner)      |
|  [ ] Finalizing                               (neutral-400, empty circle) |
+---------------------------------------------------------------------------+
```

**Annotations**

- Step indicator: all three steps show `is-complete` state (filled circles with
  checkmarks, all connectors in primary-300).
- Phase progress: a horizontal or vertical list of generation phases.
  - Each phase has an icon and label.
  - Completed phases: checkmark icon in success-700, label in neutral-800.
  - Active phase: spinner/loading icon in primary-500, label in neutral-800.
  - Pending phases: empty circle in neutral-400, label in neutral-400.
  - The wireframe shows the "all done" state. During generation the active phase
    would show a spinner and phases below it would be pending.
  - Container: subtle background (neutral-50), border, 8px radius, 16px padding.
- Document viewer: identical styling to Document Detail view
  (see [document-detail-layout.md](document-detail-layout.md)).
  - Max-width 720px, centered, serif font, shadow-md.
  - Content reflects the user's context from Step 2 (parties, terms, non-compete).
  - During streaming, content appears section by section with a subtle fade-in.
- Action bar: sticky footer, border-top.
  - Back button: secondary, returns to Step 2 for context adjustment.
  - Save button: primary style, saves document to the user's library.
  - Export PDF button: secondary/outline style, downloads PDF immediately.
  - During generation (before complete), Save and Export are disabled.

---

## Responsive Notes

At viewports narrower than 768px:

- Sidebar collapses behind a hamburger menu icon in the topbar.
- Step 1 two-column layout (reference list + selected panel) stacks vertically,
  with the selected panel becoming a collapsible summary above the list.
- Step indicator labels hide, showing only numbered circles with connectors.
- Document viewer padding reduces from 48px to 24px.
- Footer action bars remain sticky on a single row instead of stacking.
  - Steps 1 & 2: Back and Next/Generate sit side-by-side — Back as secondary,
    Next/Generate as primary CTA filling remaining space.
  - Step 3: Back and Save side-by-side (same pattern), Export PDF becomes an
    icon-only button (download icon) inline next to Save.
