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

## 11. Open Items / Things to Watch

- **Cross-journey dependencies** — keep the resolution logic in one place (`data.utils`) so it doesn't drift.
- **Schema versioning** — consider a `schemaVersion` field per JSON file so the engine can handle migrations.
- **Concurrent writes to blob** — use ETags / If-Match for optimistic concurrency on `parent.json`.
- **Auth** — confirm Managed Identity is granted Storage Blob Data Contributor on the container.
