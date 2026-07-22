---
sidebar_position: 2
title: Framework (teleportal-gds)
---

# The Framework — `packages/teleportal-gds`

The framework is where **all shared logic** lives. Consumers and the Journey Builder never reimplement rendering, validation, navigation, or persistence — they call into this package.

## Source layout

```
packages/teleportal-gds/src/
├── engine/                  # JSON → rendered page
│   ├── SchemaRenderer.tsx           # entry point — dispatches on schemaType
│   ├── FormRenderer.tsx             # form pages (fields, errors, submit)
│   ├── SummaryRenderer.tsx          # check-your-answers (+ entries blocks)
│   ├── TaskListRenderer.tsx         # application task list
│   ├── JourneyTaskListRenderer.tsx  # sub-task-list pages inside a journey
│   ├── HubRenderer.tsx              # hub ("manage") pages
│   ├── ConfirmationRenderer.tsx     # confirmation panel
│   ├── RemoveConfirmationRenderer.tsx # looping-entry removal page
│   ├── componentRegistry.tsx        # field type → design-system component dispatch
│   └── formActions.ts               # Server Actions: submit, add-instance, remove…
├── shared/
│   ├── types/               # schema.types, journey.types, component.types
│   ├── constants/           # SCHEMA_TYPES, FIELD_TYPES, TASK_STATUSES, BLOB_PATHS
│   └── utils/               # THE middleware layer (see below)
├── components/              # wrapper component library (see Components Library)
└── design-systems/          # adapter contract + GOV.UK / NHS.UK adapters
```

## The engine

`SchemaRenderer` is the single public rendering entry point. Given a `schemaType` and the loaded schema + state, it dispatches to the matching renderer. Renderers:

- never emit raw design-system markup — every element comes from the **active design-system adapter** (components) or its **token map** (heading/body/link classes);
- never fetch or persist — they receive loaded state and hand mutations to the Server Actions in `formActions.ts`;
- resolve every link through `navigation.utils` — no hand-built URLs.

`componentRegistry` maps a field's `type` (`input`, `select`, `radio`, `checkbox`, `datepicker`, `textarea`) to the adapter's component for that contract, wiring in values, errors, hints, and conditionally-revealed child fields.

`formActions.ts` holds the bundled Server Actions: `submitFormAction` (validate → save → branch → redirect), the `add-instance:` / `parent-summary` token handlers, entry removal, and summary/hub confirmation. This is also where [abandoned-branch clearing](../nextjs/schemas/form-schema.md#branching-nextwhen) is applied via `data.utils`.

## The `shared/utils` middleware

The **only** middleware layer — components and the engine call utils; utils never call back up.

| Module | Responsibility |
| --- | --- |
| `data.utils` | Loading page state (`loadFormPageState`, `loadSummaryPageState`, …), saving answers (`saveAnswers`, `saveEntryAnswers`), status transitions, **abandoned-branch diffing/clearing** (`diffAbandonedBranch`, `chainFormIds`), parent + per-journey blob synchronisation. |
| `storage.utils` | The `StorageAdapter` interface, the process-wide adapter registry (`setStorageAdapter`), the in-memory adapter, ETag plumbing. |
| `storage-azure.utils` | The Azure Blob adapter (`createAzureBlobStorageAdapter`) — `DefaultAzureCredential` / Managed Identity only, no connection strings. |
| `navigation.utils` | `URL_TEMPLATES` and the [navigation-token](../nextjs/schemas/navigation-tokens.md) resolvers (`resolveNextPath`, `resolveBackPath`, instance-aware variants). |
| `validation.utils` | Builds Yup schemas from `validation` blocks, runs them, shapes error maps for the ErrorSummary + inline field errors. |
| `schema.utils` | Schema loading/lookup helpers (`getFirstFormPage`, page finding, journey-page discrimination). |
| `request.utils` | FormData parsing — checkbox arrays, datepicker day/month/year recombination, number coercion. |
| `options.utils` | `registerOptionsProvider` — server-side dynamic select options (see [`SelectDataSource`](../nextjs/schemas/form-schema.md#select)). |

## Design-system adapters

The engine is design-system-agnostic. A `DesignSystem` is:

- **15 component contracts** — the wrapper Props types (Input, Select, Radio, Checkbox, DatePicker, TextArea, Button, BackLink, ErrorSummary, SummaryList, TaskList, Panel, Header, Footer, CookieBanner);
- **7 class tokens** for markup the engine emits itself (`headingXl`, `headingL`, `headingM`, `captionL`, `body`, `link`, `buttonGroup`).

GOV.UK is the built-in default; an NHS.UK adapter ships as the worked example. A client registers theirs once at startup:

```ts
import { configureDesignSystem, nhsukDesignSystem } from 'teleportal-gds';
configureDesignSystem(nhsukDesignSystem);
```

No engine, schema, storage, or navigation code changes. Details in [Components Library › Design-system adapters](./components-library.md#design-system-adapters).

## Behavioural guarantees (the framework contract)

- **Server-side only** — no client hooks, no `'use client'` state; every interaction is a form POST to a Server Action.
- **Validation always runs on the server**, built from the schema at request time.
- **Parent + per-journey state stay in sync** on every write, with ETag optimistic concurrency on `parent.json`.
- **Branch changes clear abandoned answers** — including resetting looping child journeys — with reconvergent pages preserved.
- **Failed validation round-trips** the user's values and errors through a transient draft blob, then clears it.

## Tests

Run with `npm test -w teleportal-gds` (Vitest). The suite covers utils (data/navigation/validation/schema/request/storage incl. Azure adapter mocking), the design-system registry, and branch-clearing regression cases surfaced by real usage.
