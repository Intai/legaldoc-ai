# LegalDoc AI -- Product Design Document

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Market Research and Competitive Analysis](#2-market-research-and-competitive-analysis)
3. [User Personas](#3-user-personas)
4. [Design Principles](#4-design-principles)
5. [Information Architecture](#5-information-architecture)
6. [Core User Flows](#6-core-user-flows)
7. [Key Design Decisions](#7-key-design-decisions)
8. [Feature Prioritization](#8-feature-prioritization)
9. [Success Metrics](#9-success-metrics)
10. [Next Steps](#10-next-steps)

---

## 1. Executive Summary

LegalDoc AI streamlines legal document creation. Select one or more reference documents, provide your questions or specific context, and the system generates a tailored legal document -- ready to review, and save.

The product addresses a significant gap in the legal tech market: most existing tools are either enterprise-grade platforms priced for large law firms, or generic AI chatbots that lack the domain specificity and document management rigor that legal work demands. LegalDoc AI targets the underserved middle ground -- professionals and small businesses who need reliable, contextually accurate legal documents without the overhead of enterprise systems or the risk of unstructured AI output.

### Product Vision

Make professional-quality legal document creation accessible, fast, and trustworthy for anyone who needs it -- from solo practitioners to small business owners -- by combining reference-driven AI generation with a focused review workflow.

---

## 2. Market Research and Competitive Analysis

### 2.1 Market Landscape

The global legal AI software market was valued at approximately USD 655 million in 2025 and is projected to reach USD 837 million in 2026, growing at a CAGR of 27.8% through 2035. The broader legal tech market is estimated at USD 20.8 billion in 2025, with projections reaching USD 65.5 billion by 2034. The AI legal drafting tools segment specifically is expected to reach USD 3.42 billion by 2030 at a 30.7% CAGR.

Key adoption signals:
- 65% of law firms are integrating AI tools for research and document automation.
- 58% of corporate legal departments rely on AI-based contract analysis.
- 52% of legal professionals report improved efficiency through AI.
- 64% of legal and compliance leaders plan to accelerate legal tech investments.

The market in 2026 is entering a consolidation phase, with agentic AI moving from experimental to embedded in legal workflows. This creates an opportunity for a focused, well-designed new entrant.

### 2.2 Competitive Landscape

**Enterprise / High-End**
- Spellbook: Integrates with Microsoft Word for clause generation and contract review. Strong in transactional law. Priced for law firms.
- Harvey AI: Supports complex document creation across legal workflows. Positioned for large firms and corporate legal.
- CoCounsel (by Casetext / Thomson Reuters): AI-powered research and document review. Deep legal research integration.
- Lexis+ AI: Natural language legal research with real-time validation. Backed by LexisNexis data.

**Mid-Market / Workflow**
- Onit: Enterprise workflow automation combining document automation with contract lifecycle management. Highly customizable but complex.
- Filevine: Document versioning and management for litigation teams. Strong in case management.

**Low-End / Self-Service**
- Gideon: Client intake and document automation for solo and small firms.
- Rocket Lawyer / LegalZoom: Template-based self-service for consumers and small businesses. Limited AI, mostly form-fill.
- ChatGPT / generic LLMs: Accessible but lack legal-specific guardrails, citation support, and document management.

### 2.3 Competitive Gaps and Opportunities

| Gap | Description | LegalDoc AI Opportunity |
|-----|-------------|------------------------|
| Reference-driven generation | Most tools generate from prompts alone or rigid templates. Few allow users to ground generation in their own reference documents. | Core differentiator: users select reference documents as the foundation, ensuring output reflects their specific legal standards and language. |
| Guided context gathering | Generic AI tools require users to know exactly what to ask. Legal document creation needs structured input. | Provide guided question flows that elicit the right context for each document type. |
| Transparent AI process | Users distrust black-box generation. | Show which references influenced the output and make the generation process visible. |
| Affordable professional quality | Enterprise tools are expensive. Consumer tools lack depth. | Target the "professional but accessible" tier with pricing and UX to match. |

---

## 3. User Personas

### 3.1 Primary Personas

**Persona 1: Solo / Small Firm Lawyer -- "Sarah"**

- Demographics: 35-50 years old, 5-15 years of experience, runs or works in a 1-10 person practice.
- Practice areas: General practice, family law, real estate, estate planning, small business law.
- Context: Handles a high volume of document types. Time is billable, so efficiency is paramount. Has a library of past documents she references when drafting new ones.
- Pain points:
  - Spends 30-60 minutes per document on first drafts that follow familiar patterns.
  - Manually copies and adapts clauses from past documents.
  - Cannot afford enterprise legal tech tools (USD 500+/month per seat).
  - Worried about AI accuracy and liability if AI-generated language has errors.
- Needs: Fast document generation grounded in her own trusted references. Confidence that the output is legally sound. Export to standard formats.
- Success criteria: Reduces document creation time by 60% or more. Output quality is high enough to use with minimal external revision.

**Persona 2: Paralegal / Legal Assistant -- "Marcus"**

- Demographics: 25-40 years old, works under attorney supervision in a small to mid-size firm.
- Context: Prepares initial drafts for attorney review. Manages document libraries. Handles client intake information that feeds into documents.
- Pain points:
  - Assembles documents from multiple templates and past work, which is error-prone.
  - Gets revision requests from attorneys that require significant rework.
  - Needs to maintain consistency across a firm's document library.
- Needs: Reliable generated documents that reduce back-and-forth with supervising attorneys. Ability to select multiple reference documents to ensure completeness.
- Success criteria: Fewer revision rounds with attorneys. Consistent document quality across the firm.

**Persona 3: Small Business Owner -- "Priya"**

- Demographics: 28-55 years old, runs a business with 1-50 employees. May or may not have legal counsel.
- Context: Needs legal documents (contracts, NDAs, employment agreements, vendor agreements, privacy policies) but legal services are expensive. Currently uses free templates or generic AI.
- Pain points:
  - Does not know what legal language is appropriate or complete.
  - Free templates are generic and may not cover her specific situation.
  - Cannot evaluate whether an AI-generated document is legally adequate.
  - Regulatory compliance requirements are confusing (e.g., data privacy laws, the Corporate Transparency Act).
- Needs: Guided document creation that asks the right questions. Plain-language explanations alongside legal language. Confidence that the document covers necessary bases. Affordable access.
- Success criteria: Creates professional-quality documents without needing to hire a lawyer for routine matters. Understands what the document does and why each section matters.

### 3.2 Secondary Personas

**Persona 4: In-House Counsel -- "David"**

- Works in a company with 50-500 employees. Responsible for contracts, compliance, and employment documents. Needs volume efficiency and consistency. May evaluate LegalDoc AI for team-wide adoption.

**Persona 5: Freelancer / Contractor -- "Aisha"**

- Independent professional who needs service agreements, NDAs, and scope-of-work documents. Very price-sensitive. Needs simplicity and speed above all.

---

## 4. Design Principles

These principles should guide every design decision for LegalDoc AI. They are ordered by priority.

### 4.1 Trust Through Transparency

Legal documents carry real consequences. Users must trust the output. The system should always make clear what references informed the generation and what the AI decided versus what the user provided. Never hide the AI's reasoning or sources.

### 4.2 Guided Confidence

Not every user is a legal expert. The interface should guide users through the document creation process with structured inputs, contextual explanations, and progressive disclosure. Users should feel confident they are providing the right information and getting a complete result, even if they lack legal training.

### 4.3 Professional Clarity

Legal work demands precision. The interface should be clean, structured, and typographically rigorous. Avoid visual clutter, playful tones, or ambiguous language. Use a professional visual vocabulary: clear hierarchy, generous whitespace, restrained color, and readable typography.

### 4.4 Efficiency for Experts

Experienced legal professionals should never feel slowed down by the interface. Allow skipping guided flows, support keyboard shortcuts, and minimize clicks for repeated tasks. The system should get out of the way for power users while remaining approachable for newcomers.

---

## 5. Information Architecture

### 5.1 Navigation Structure

The application uses a persistent left sidebar for primary navigation, with the main content area occupying the majority of the screen.

**Primary Navigation (Left Sidebar)**

- Documents (home -- list of saved documents)
- New Document (creation flow)

**Top Bar**

- Search (searches across documents and references)
- User menu (settings, sign out)

### 5.2 Screen Map

```
Documents (Home)
  |
  +-- Document list (filterable by type, date)
  +-- Document detail (read-only viewer with export)
  |
New Document (Creation Flow)
  |
  +-- Step 1: Select References
  +-- Step 2: Provide Context
  +-- Step 3: Review & Save
  |
Settings (via User menu)
  |
  +-- Profile
  +-- Preferences (language, default export format)
```

### 5.3 Content Model

The system manages three primary content types:

**Reference Documents**: Uploaded by users. These are the source materials that ground AI generation. They may be past contracts, template documents, legal standards, or regulatory texts. Stored in MongoDB with extracted text content for AI processing.

**Generated Documents**: The output of the AI workflow. Each generated document has a parent relationship to the references that informed it and a record of the user context provided.

**Generation Session**: The references, context, and configuration provided during document creation. Stored so users can revisit and re-generate with modified inputs.

---

## 6. Core User Flows

### 6.1 Flow 1: New Document Creation (Primary Flow)

This is the core workflow and the product's central experience. It follows a three-step progression with the ability to go back to any previous step.

**Step 1 -- Select Reference Documents**

The user begins by choosing one or more reference documents that will inform the AI generation. This is the key differentiator of LegalDoc AI: generation is grounded in the user's own reference materials, not just generic training data.

- The screen presents the user's reference library in a browsable, searchable list.
- Each reference shows its name, document type tag, upload date, and a brief preview snippet.
- Users select references by clicking them; selected items receive a visible check indicator and appear in a "Selected References" summary panel on the right.
- Users can upload new reference documents directly from this step via a drag-and-drop area or file picker at the top. Newly uploaded documents are immediately available for selection.
- Supported upload formats: PDF, TXT, and plain text paste.
- A minimum of one reference is required to proceed. The "Next" button remains disabled until at least one reference is selected.
- Filtering by document type tags and a search bar are available.

**Step 2 -- Provide Context**

The user provides the specific context that makes this document unique.

- The primary input is a large text area where the user describes what they need: the purpose of the document, the parties involved, specific terms or conditions, questions they want addressed, and any other relevant context.
- A prominent "Generate Document" button initiates generation.
- The system stores all context inputs as part of the generation session for future reference.

**Step 3 -- Review & Save**

The generated document streams in and is presented for review, saving, and export.

- A progress indicator at the top shows which phase of generation is active (e.g., "Analyzing references...", "Structuring document...", "Drafting sections...", "Finalizing..."). These phase labels correspond to LangGraph nodes in the backend workflow.
- The document content streams into the view section by section, using server-sent events. Users can begin reading while generation continues.
- The user can cancel generation at any time. Partially generated content is preserved.
- Once complete, the document is displayed in a clean, read-only document viewer.
- Actions available: **Save** (stores to the user's document list), **Export** (PDF), and **Back** (return to previous steps to adjust references or context and regenerate).
- The iteration loop is simple: if the result is not satisfactory, go back, adjust context or references, and regenerate.

### 6.2 Flow 2: Document Management

- The Documents screen is the application home. It presents all saved documents in a list view.
- Each list item shows: document title, document type tag, creation date, and a truncated preview of the first paragraph.
- Sorting options: most recent, alphabetical.
- Filtering: by document type tag, by date range.
- Clicking a document opens a read-only detail view with the full document content and export option (PDF).

---

## 7. Key Design Decisions

### 7.1 Reference Selection: Library-First, Not Upload-First

**Decision**: Present the user's existing reference library as the primary selection interface, with upload as a secondary action within that interface.

**Rationale**: Most legal professionals reuse references across many documents. Making the library the default starting point reinforces the habit of building a curated reference collection, which increases long-term platform value and retention. First-time users or one-off users can upload on the spot without friction, but the design nudges toward library building.

**Alternative considered**: An upload-first flow where users always start by uploading. Rejected because it creates unnecessary friction for repeat users and fails to leverage the platform's accumulated value over time.

### 7.2 Context Input: Free Text With Inline Settings

**Decision**: The primary context input is an open-ended text area with a "Generate" button. No configuration options for tone or length.

**Rationale**: Legal documents are inherently formal and comprehensive. Offering tone or length settings would imply that a "concise" or "neutral" legal document is a valid choice, which undermines trust. A single screen with free text and a "Generate" button keeps the flow fast and focused.

### 7.3 AI Generation: Phased Streaming

**Decision**: Stream the generated document to the user in real time, organized by visible phases that correspond to the LangGraph workflow stages.

**Rationale**: Streaming addresses perceived latency -- research shows users perceive streaming responses as 40-60% faster than equivalent non-streaming responses. The phased progress indicators ("Analyzing references...", "Structuring document...", "Drafting sections...") provide meaningful context about what the system is doing, which builds trust.

**Technical alignment**: The backend uses LangGraph for workflow orchestration, which naturally decomposes into nodes/phases. FastAPI supports server-sent events for streaming. RxJS on the frontend is well-suited to handling streaming data and updating the UI reactively.

### 7.4 Review, Not Edit: Read-Only Output With Regeneration

**Decision**: The generated document is presented in a read-only viewer. Users who want changes go back and regenerate with adjusted context, rather than editing inline.

**Rationale**: This keeps the product focused on what it does best -- AI generation from references. A rich-text editor adds significant complexity (editor library, auto-save, version history, conflict resolution) for a feature that fights the core value proposition. Users who need to edit can copy the content or use the exported PDF as a starting point in their preferred word processor. The regeneration loop (adjust context, regenerate) reinforces the reference-driven workflow and produces a cleaner, more consistent output than piecemeal editing.

**Alternative considered**: An integrated rich-text editor with section-level AI actions. Rejected because it substantially increases MVP scope, requires a complex editor library, and shifts the product toward being a word processor rather than a document generator.

### 7.5 Visual Language: Professional and Restrained

**Decision**: Use a neutral, professional color palette. Minimize decorative elements. Prioritize typography and whitespace.

**Rationale**: Legal professionals work in a conservative domain. The interface must feel trustworthy and serious. Visual noise undermines confidence in the output.

**Typography**: Use the system font stack for UI elements. Use a serif or document-appropriate font for the document viewer to reinforce the "document" feeling.

### 7.6 Navigation: Sidebar With Contextual Top Bar

**Decision**: Persistent left sidebar for primary navigation with two items (Documents, New Document). Settings accessible via the User menu in the top bar. The sidebar collapses behind a hamburger menu icon on smaller viewports.

**Rationale**: Document-centric applications consistently use sidebar navigation because it provides stable orientation while maximizing horizontal space for content. Two nav items keep the sidebar minimal and focused on the core actions. Settings are infrequently accessed and fit naturally under the User menu.

### 7.7 Localisation Strategy

**Decision**: All user-facing strings are externalized through i18next from the start. The initial release supports English. The architecture supports adding languages without code changes.

**Rationale**: Legal document creation is inherently jurisdiction-specific, and future expansion to non-English markets is likely. Building localisation into the architecture from day one avoids costly retrofitting.

---

## 8. Feature Prioritization

### 8.1 MVP (Phase 1)

These features constitute the minimum viable product -- the core workflow end-to-end.

| Feature | Description | Personas Served |
|---------|-------------|-----------------|
| Reference upload and library | Upload PDF, TXT reference documents. Browse, search, and tag references. | All |
| Reference selection | Select one or more references from the library during document creation. | All |
| Free-text context input | Open-ended text area for providing document context and questions. | All |
| AI document generation with streaming | LangGraph-powered generation with real-time streaming output and phase indicators. | All |
| Document viewer | Clean, read-only presentation of generated documents. | All |
| Save and document list | Save generated documents. Browse, search, and filter saved documents. | All |
| Export to PDF | Download the finished document in professional format. | All |
| Per-user document storage | Secure, isolated document and reference storage per user. | All |
| Responsive layout | Functional on desktop and tablet viewports. | All |

### 8.2 Phase 2 -- Enhanced Experience

| Feature | Description |
|---------|-------------|
| User authentication | Sign up, sign in, password reset. |
| Guided prompts | AI-generated contextual questions based on selected references and document type, shown as an expandable section in Step 2. |
| Source attribution panel | Toggleable sidebar showing which references influenced each section of the generated output. |
| Document type auto-tagging | Automatically suggest document type tags based on content. |

### 8.3 Phase 3 -- Growth and Scale

| Feature | Description |
|---------|-------------|
| Workspace and team support | Shared reference libraries, shared documents, role-based permissions. |
| Template creation | Save a generated document as a reusable template with configurable fields. |
| Multi-language document generation | Generate documents in languages other than English. |

### 8.4 Out of Scope

- E-signature integration (users export and sign via their preferred tool).
- Legal advice or outcome prediction (the system generates documents, not counsel).
- Case management or matter tracking (not a practice management tool).
- Real-time multi-user co-editing.
- Inline document editing.

---

## 9. Success Metrics

### 9.1 Primary Metrics (North Star)

**Documents generated per active user per month**: Measures whether users find enough value to return and create documents regularly. Target: 4+ documents per active user per month within 6 months of launch.

**Save rate**: The percentage of generated documents that users save (rather than discarding and regenerating or abandoning). Target: 70%+, indicating the AI output meets expectations.

### 9.2 Engagement Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Time to first document | Time from account creation to first completed document generation. | Under 10 minutes |
| References per generation | Average number of reference documents selected per generation session. | 2+ (indicates users are leveraging the reference-driven approach) |
| Return rate (7-day) | Percentage of users who return within 7 days of their first document. | 40%+ |
| Export rate | Percentage of saved documents that are exported. | 60%+ (indicates documents are being used, not just experimented with) |

### 9.3 Quality Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Regeneration rate | How often users go back to adjust context and regenerate (per session). Lower is better. | Under 2 regenerations per session on average |
| Generation cancellation rate | How often users cancel generation before completion. | Under 10% |
| Abandonment rate | Sessions where the user neither saves nor exports. | Under 30% |

---

## 10. Next Steps

### 10.1 Immediate Design Actions

1. **Wireframe the creation flow (Steps 1-3)** at low fidelity to validate the step structure, layout proportions, and information density.

2. **Prototype the streaming generation experience** to test perceived performance and determine the right granularity of phase indicators.

3. **Define the reference document processing pipeline** -- what formats are supported, how text is extracted, how content is chunked and stored in MongoDB for AI retrieval.

4. **Audit shadcn/ui components** against the screen map to identify which existing components cover the needs and where custom components are required.

5. **Establish the design token system** (colors, typography, spacing) in Tailwind configuration, aligned with the visual language decisions in Section 7.5.

### 10.2 Technical Design Coordination

The following items require close coordination between product design and engineering:

- **Streaming protocol**: Confirm server-sent events as the streaming mechanism between FastAPI and the React frontend. Define the event payload structure so the frontend can render phase indicators and progressive content.
- **Reference processing**: Define the upload pipeline -- how text is extracted from PDF and TXT, how content is chunked and stored in MongoDB for AI retrieval.
- **LangGraph workflow structure**: The generation phases shown to the user should map to actual LangGraph nodes. Coordinate the node naming and status reporting.
- **Document export**: Evaluate libraries for server-side PDF generation with professional legal document formatting.

---

## Appendix A: Competitive Reference Links

- [9 Best Legal AI Tools for Lawyers in 2026 -- Spellbook](https://www.spellbook.legal/learn/legal-ai-tools)
- [25 Best Legal AI Tools for Lawyers in 2026 -- Hyperstart](https://www.hyperstart.com/blog/legal-ai-tools/)
- [Best AI for Legal Documents: Top 7 Tools for 2026 -- Briefpoint](https://briefpoint.ai/best-ai-for-legal-documents/)
- [AI for Legal Documents in 2025: Use Cases, Trends and Tools -- Pocketlaw](https://pocketlaw.com/content-hub/ai-for-legal-documents)
- [AI-Driven Legal Tech Trends for 2025 -- NetDocuments](https://www.netdocuments.com/blog/ai-driven-legal-tech-trends-for-2025/)
- [85 Predictions for AI and the Law in 2026 -- National Law Review](https://natlawreview.com/article/85-predictions-ai-and-law-2026)
- [The Best Legal Document Automation Software 2026 -- Xakia](https://www.xakiatech.com/blog/the-best-legal-document-software)
- [6 UX/UI Design Principles in Legal Tech That Work -- Lazarev](https://www.lazarev.agency/articles/legaltech-design)
- [Streaming Responses for Real-Time UX -- MakeAIHQ](https://makeaihq.com/guides/cluster/streaming-responses-real-time-ux-chatgpt)
- [How to Design AI Features That Actually Improve UX -- LogRocket](https://blog.logrocket.com/ux-design/ai-driven-ux-design-patterns)

## Appendix B: Glossary

- **Reference document**: A user-uploaded document that serves as source material for AI generation. Examples include past contracts, legal templates, regulatory texts, or standard clauses.
- **Generated document**: The output of the AI workflow, created based on selected references and user-provided context.
- **Generation session**: The complete record of a document creation attempt, including selected references, context inputs, configuration, and the resulting generated output.
- **LangGraph node**: A discrete step in the AI workflow pipeline. Nodes correspond to visible generation phases in the UI.
