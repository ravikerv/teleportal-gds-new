# TelePortal GDS — Architecture Document

## 1. Overview

**TelePortal GDS** is a versioned React component library that wraps the **GovUK** front-end design system. It enables consuming projects to build complete user journeys (form pages, summary, confirmation, task lists) declaratively through **JSON schemas**, with no manual rendering code required by developers.

### Core Principle
> Developers should only ever touch JSON schema files. The library handles rendering, validation, navigation, state, and persistence.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  CONSUMING NEXT.JS PROJECT                       │
│  - File-based routing (mirrors blob storage structure)           │
│  - Imports TelePortal GDS as versioned dependency                │
│  - Provides JSON schemas (locally + blob)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ consumes
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         TELEPORTAL GDS LIBRARY (versioned npm package)           │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SCHEMA ENGINE (JSON → Component Renderer)                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SHARED FRAMEWORK LAYER (utils — middleware)              │  │
│  │  - data utils    - request utils                          │  │
│  │  - storage utils - navigation utils                       │  │
│  │  - validation (Yup)                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  REACT COMPONENT WRAPPERS (around GovUK)               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                             │                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  GOVUK BASE COMPONENTS                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ server-side I/O
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AZURE BLOB STORAGE                           │
│  - JSON schemas (form, summary, task-list, confirmation)         │
│  - User answer data (parent + per-journey)                       │
│  - Folder structure mirrors Next.js routing                      │
│  - Authenticated via Managed Identity                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Design Decisions

| Decision | Rationale |
|---|---|
| **Server-side JavaScript only** | No client-side hooks/Context API. State lives on the server, via Server Components and Server Actions. |
| **JSON schema driven** | Devs only edit JSON. No manual rendering code. Lowers maintenance, enables future visual builder. |
| **Wrapper components over GovUK** | We never expose GovUK directly. Wrappers give us a stable API even if GovUK changes. |
| **Design-system adapters** | The engine resolves every component and typographic class through a pluggable `DesignSystem` adapter (GovUK is the built-in default). A new client's design system is a new adapter package, not an engine change. See §11. |
| **Yup for validation** | Mature, declarative, integrates well with schema-driven forms. |
| **Versioned library distribution** | Consumers pin to a version; we can iterate without breaking them. |
| **Azure Blob for state + schemas** | Single source of truth. Folder layout mirrors Next.js routing for predictable lookups. |
| **Managed Identity auth** | No secrets to rotate. Cleaner ops than SAS tokens. |
| **Storybook + Docusaurus** | Storybook = visual catalog of components. Docusaurus = the "how to use" docs. |

---

## 4. Library Folder Structure

```
teleportal-gds/                        # the library repo
├── package.json                       # versioned: e.g. 1.0.0
├── tsconfig.json
├── README.md
│
├── src/
│   ├── components/                    # wrapper React components
│   │   ├── Input/
│   │   │   ├── Input.tsx              # wraps GovUK Input
│   │   │   ├── Input.stories.tsx      # Storybook story
│   │   │   └── index.ts
│   │   ├── Select/
│   │   ├── Radio/
│   │   ├── Checkbox/
│   │   ├── DatePicker/
│   │   ├── TextArea/
│   │   ├── Button/
│   │   ├── SummaryList/
│   │   ├── TaskList/
│   │   ├── ErrorSummary/
│   │   └── index.ts                   # barrel export
│   │
│   ├── shared/                        # the "framework / middleware" layer
│   │   ├── utils/
│   │   │   ├── data.utils.ts          # data shaping, parent/journey sync
│   │   │   ├── request.utils.ts       # GET/POST helpers
│   │   │   ├── storage.utils.ts       # blob read/write
│   │   │   ├── navigation.utils.ts    # journey → page resolution
│   │   │   ├── validation.utils.ts    # Yup schema construction
│   │   │   └── schema.utils.ts        # schema parsing & traversal
│   │   ├── types/
│   │   │   ├── schema.types.ts        # Form/Summary/TaskList/Confirmation
│   │   │   ├── journey.types.ts
│   │   │   └── component.types.ts
│   │   └── constants/
│   │
│   ├── engine/                        # JSON → component renderer
│   │   ├── SchemaRenderer.tsx         # main entry: schema → JSX
│   │   ├── FormRenderer.tsx
│   │   ├── SummaryRenderer.tsx
│   │   ├── TaskListRenderer.tsx
│   │   ├── ConfirmationRenderer.tsx
│   │   └── componentRegistry.ts       # maps "type" string → component
│   │
│   └── index.ts                       # public exports
│
├── .storybook/                        # Storybook config
└── docs/                              # Docusaurus site
```

---

## 5. Schema Design

Each journey is described by **four schema files**, all stored in blob (and optionally locally during dev):

### 5.1 `form-schemas.json`
Holds an array of form pages. Each page has its own `formId` and an array of fields.

```json
{
  "journeyId": "personal-details",
  "forms": [
    {
      "formId": "name-page",
      "title": "What is your name?",
      "fields": [
        {
          "id": "firstName",
          "type": "input",
          "label": "First name",
          "validation": { "required": true, "minLength": 1 }
        },
        {
          "id": "lastName",
          "type": "input",
          "label": "Last name",
          "validation": { "required": true }
        }
      ],
      "next": "dob-page"
    },
    {
      "formId": "dob-page",
      "title": "What is your date of birth?",
      "fields": [
        {
          "id": "dob",
          "type": "datepicker",
          "label": "Date of birth",
          "validation": { "required": true }
        }
      ],
      "next": "summary"
    }
  ]
}
```

### 5.2 `summary-schema.json`
Defines how to display all collected answers.

```json
{
  "journeyId": "personal-details",
  "title": "Check your answers",
  "rows": [
    { "key": "First name", "valueFrom": "name-page.firstName", "changeLink": "name-page" },
    { "key": "Last name",  "valueFrom": "name-page.lastName",  "changeLink": "name-page" },
    { "key": "DOB",        "valueFrom": "dob-page.dob",        "changeLink": "dob-page" }
  ],
  "next": "confirmation"
}
```

### 5.3 `task-list-schema.json`
Lists journeys/tasks the user must complete.

```json
{
  "title": "Apply for a permit",
  "tasks": [
    { "id": "personal-details", "label": "Your details", "status": "completed" },
    { "id": "address",          "label": "Your address", "status": "in-progress" },
    { "id": "employment",       "label": "Employment",   "status": "not-started",
      "dependsOn": ["personal-details"] }
  ]
}
```

### 5.4 `confirmation-schema.json`

```json
{
  "journeyId": "personal-details",
  "panelTitle": "Application complete",
  "referenceLabel": "Your reference number",
  "referenceFrom": "system.referenceId",
  "nextStepsMarkdown": "We'll email you within 5 working days."
}
```

### 5.5 Nested Journeys (future-ready)
A task in the task list can itself reference another `journeyId`, enabling a journey-within-a-journey. The schema engine resolves recursively.

```json
{
  "id": "household",
  "label": "Household members",
  "type": "nested-journey",
  "journeyRef": "household-member-journey"
}
```

---

## 6. Data Flow

### 6.1 Read
1. Next.js Server Component requests page `/permit/personal-details/name-page`.
2. `storage.utils` reads `form-schemas.json` from blob at the matching folder path.
3. `schema.utils` looks up `formId: "name-page"`.
4. `FormRenderer` walks the fields and resolves each via `componentRegistry`.
5. Server Component renders the result; HTML returned to browser.

### 6.2 Write
1. User submits form → Next.js Server Action receives FormData.
2. `validation.utils` builds a Yup schema from the form schema and validates.
3. On success: `data.utils` updates **both** the per-journey JSON and the parent JSON (cross-dependent answers cascade here).
4. `storage.utils` writes the updated blobs.
5. `navigation.utils` resolves `next` and redirects.

### 6.3 Parent / Journey Sync
- **Parent JSON** holds the full state for all journeys in the application.
- **Per-journey JSON** is the localized slice.
- On every save, both are updated atomically server-side. This keeps cross-journey dependencies (e.g. "show field X in Journey B only if Journey A answered Y") trivially resolvable.

---

## 7. Blob Storage Layout

```
<container>/
└── applications/
    └── {applicationId}/
        ├── parent.json                          # full state
        ├── schemas/
        │   ├── task-list-schema.json
        │   └── journeys/
        │       ├── personal-details/
        │       │   ├── form-schemas.json
        │       │   ├── summary-schema.json
        │       │   └── confirmation-schema.json
        │       └── address/
        │           └── ...
        └── data/
            └── journeys/
                ├── personal-details.json        # per-journey answers
                └── address.json
```

The Next.js routing mirrors `applications/{id}/journeys/{journeyId}/{formId}` so paths in code, paths in blob, and URLs all align.

---

## 8. Validation (Yup)

`validation.utils.ts` converts the `validation` block on each field into a Yup schema at runtime:

```ts
// pseudo-code
function buildYupSchema(fields) {
  const shape = {};
  for (const field of fields) {
    let v = yup.string();
    if (field.validation?.required) v = v.required(`${field.label} is required`);
    if (field.validation?.minLength) v = v.min(field.validation.minLength);
    if (field.validation?.pattern)   v = v.matches(new RegExp(field.validation.pattern));
    shape[field.id] = v;
  }
  return yup.object().shape(shape);
}
```

Errors map back to the `ErrorSummary` and inline field error components.

---

## 9. Tooling

- **Storybook** — every wrapper component has a `.stories.tsx`. One unified catalog.
- **Docusaurus** — usage docs, schema reference, contribution guide.
- **TypeScript** — strict mode, with shared `types/` exported for consumers.
- **Yup** — runtime validation.
- **Next.js (consumer)** — App Router, Server Components, Server Actions only.

---

## 10. Phasing

### Phase 1 — current scope
Library + schema engine + utils framework + blob integration. Devs author JSON schemas by hand.

### Phase 2 — Journey Builder (future)
Visual drag-and-drop canvas where each "node" is a form page (or summary, confirmation, etc.). A **Generate** button exports the JSON schemas straight into blob storage. Consuming Next.js apps pick them up automatically. **No changes to Phase 1 architecture required.**

---

## 11. Design-System Adapters (multi-tenant theming)

The product is design-system agnostic. GOV.UK is the *default*, not a
dependency of the engine.

### Contract

```ts
// teleportal-gds
export type DesignSystem = {
  name: string;
  components: DesignSystemComponents; // one component per wrapper Props contract:
                                      // Input, Select, Radio, Checkbox, DatePicker,
                                      // TextArea, Button, BackLink, ErrorSummary,
                                      // SummaryList, TaskList, Panel, Header, Footer,
                                      // CookieBanner
  tokens: DesignSystemTokens;         // class tokens the engine emits directly:
                                      // headingXl/L/M, captionL, body, link, buttonGroup
};
```

The wrapper **Props types are the stable contracts** — they carry no GOV.UK
semantics (label, hint, error, options, …). The engine (`renderField` and
every renderer) resolves components and tokens through the active adapter
at render time and contains **zero** direct design-system imports.

### Usage

```ts
// Consuming app, once at startup (e.g. root layout module):
import { configureDesignSystem } from 'teleportal-gds';
import { acmeDesignSystem } from '@acme/teleportal-ds';

configureDesignSystem(acmeDesignSystem); // omit entirely for GOV.UK
```

The registry is a server-side module singleton (Server Components — no
Context API), configured once per process; renderers resolve lazily so
import order doesn't matter.

### Shipping a new client design system

1. New package `@<client>/teleportal-ds` implementing `DesignSystem`
   against the exported Props contracts (plus its own CSS).
2. `configureDesignSystem(clientDs)` in the consuming app.
3. Schemas, storage, validation, navigation, journeys — all unchanged.

### Shipped example: NHS.UK

`nhsukDesignSystem` (exported from teleportal-gds) is the reference
non-GOV.UK adapter — a full component set implementing the same Props
contracts with nhsuk-frontend markup. It proves the swap end-to-end and
doubles as the template for client adapters.

### Builder preview

The Journey Builder's preview panes and whole-journey walkthrough have a
**design-system switcher** (GOV.UK / NHS.UK). Preview markup is authored
against GOV.UK classes and transformed per skin (`preview/skin.ts` —
mirrors the runtime adapters; nhsuk-frontend is a govuk-frontend fork so
classes map by prefix plus a few exceptions). Adding a third design
system to the builder = one skin entry + its CSS; at runtime = one
adapter package.

---

## 12. AI Journey Import (Mural → Builder)

BAs design journeys on a Mural board (conventions: `docs/docs/mural-conventions.md`);
AI converts the board into schema files. Two tiers:

- **Phase 0 (interactive)** — the repo's `/mural-import` Claude Code skill:
  any MCP-capable agent host (Claude Code, or e.g. VS Code Copilot agent
  mode) with the Mural MCP server connected generates a zip for the
  builder's Import button.
- **Phase 1 (in-product)** — `packages/mural-import-service`, a small Node
  companion service: `POST /import {muralUrl}` → fetches widgets via the
  Mural MCP server → LLM generates the bundle (structured output) →
  server-side referential validation with one self-repair round → the
  builder's **Import from Mural** dialog shows the AI's assumptions and
  unresolved issues, and Apply loads the project (undo restores the
  previous one). Nothing is exported without BA review.

**Provider abstraction:** the LLM sits behind `LlmProvider`
(`generateBundle` / `repairBundle`). Default is the Claude API
(`claude-opus-4-8`, adaptive thinking, streaming); a mock provider serves
tests/dev (`LLM_PROVIDER=mock`). Swapping to another vendor (e.g. GitHub
Models or any OpenAI-compatible endpoint — the realistic "GitHub Copilot"
server-side path) is one new provider class; prompt, Mural fetch,
validation, and UI are untouched.

**Config (service env):** `ANTHROPIC_API_KEY` (or an `ant auth login`
profile), `MURAL_MCP_URL` + `MURAL_MCP_TOKEN` (+ optional
`MURAL_MCP_WIDGETS_TOOL`), `LLM_PROVIDER`, `PORT` (8787),
`ALLOWED_ORIGIN`. Builder side: `VITE_MURAL_IMPORT_SERVICE`.

---

## 13. Open Items / Things to Watch

- **Cross-journey dependencies** — keep the resolution logic in one place (`data.utils`) so it doesn't drift.
- **Schema versioning** — consider a `schemaVersion` field per JSON file so the engine can handle migrations.
- **Concurrent writes to blob** — use ETags / If-Match for optimistic concurrency on `parent.json`.
- **Auth** — confirm Managed Identity is granted Storage Blob Data Contributor on the container.
