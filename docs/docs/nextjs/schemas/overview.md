---
sidebar_position: 1
title: Schemas Overview
---

# JSON Schemas — Overview

Every journey in a TelePortal GDS application is described entirely by JSON. Developers (or the Journey Builder, or the AI Mural import) author these files; the framework renders, validates, navigates, and persists — no page-specific code is ever written.

There are **four authored schema types**, plus a small set of state files the framework manages for you:

| File | Scope | Purpose | Reference |
| --- | --- | --- | --- |
| `form-schemas.json` | One per journey | Every page in the journey: form pages, hub pages, sub-task-lists, plus branching and looping config | [Form Schema](./form-schema.md) |
| `summary-schema.json` | One per journey (optional) | The "Check your answers" page, including repeatable-entry listings | [Summary Schema](./summary-schema.md) |
| `task-list-schema.json` | One per application | The application-level list of journeys, grouped into sections | [Task List Schema](./task-list-schema.md) |
| `confirmation-schema.json` | One per journey (optional) | The post-submit panel with reference number and next steps | [Confirmation Schema](./confirmation-schema.md) |
| `parent.json`, `data/journeys/*` | Managed by the framework | Runtime answers and status — never authored by hand | [State & Persistence](./state-persistence.md) |

## Where the files live

The blob-storage layout mirrors the Next.js routes, so URLs, code paths, and blob keys always align:

```
applications/{applicationId}/
├── parent.json                                  # auto-managed runtime state
├── schemas/
│   ├── task-list-schema.json                    # one per application
│   └── journeys/
│       └── {journeyId}/
│           ├── form-schemas.json                # required
│           ├── summary-schema.json              # optional
│           └── confirmation-schema.json         # optional
└── data/
    └── journeys/
        ├── {journeyId}.json                     # auto-managed per-journey state
        └── {journeyId}/_drafts/{formId}.json    # transient validation round-trips
```

The path builders in `BLOB_PATHS` (exported from the framework) are the single source of truth for these locations — no code ever hand-builds a blob key.

## How the pieces connect

1. The **task list** points at journeys (`tasks[].id` = a `journeyId`).
2. Each journey's **form schema** defines its pages and how they chain together via [navigation tokens](./navigation-tokens.md) (`next`, `back`, `nextWhen`).
3. A journey typically ends at its **summary** (`"next": "summary"`), whose submit marks the journey complete.
4. The **confirmation** page reads the engine-issued reference number out of parent state.
5. Every answer the citizen submits is stored in **parent state**, which is what summary rows, hub items, and pre-render guards read from via `valueFrom` paths.

## The `valueFrom` path syntax

Several schema properties (`SummaryRow.valueFrom`, `HubItemSource.valueFrom`, `RedirectIfMissing.valueFrom`, `ConfirmationSchema.referenceFrom`, `SelectDataSource.paramFrom`, `showWhen.valueFrom`) all share one path syntax for reading values from parent state:

| Form | Resolves against | Example |
| --- | --- | --- |
| `{formId}.{fieldId}` | The current journey's saved answers | `"name-page.firstName"` |
| `system.{key}` | The application-wide `parent.system` object | `"system.referenceId"` |

Inside a summary `entries` block, `valueFrom` paths are rooted in **each entry's own answers** rather than the journey's flat answers — see [Summary Schema › entries](./summary-schema.md#entries--repeatable-entry-block).

## Authoring options

You never have to write these files by hand-cranked JSON alone:

- **Journey Builder** — the visual editor round-trips these exact files (Import folder / Import zip / Export), and its canvas, inspectors, and preview are all backed by the same schema types.
- **AI Mural import** — a Mural board following the [Mural conventions](../../mural-conventions.md) can be converted into a complete schema bundle for review in the Journey Builder.
- **TypeScript types** — `FormSchema`, `SummarySchema`, `TaskListSchema`, `ConfirmationSchema` (and every nested type) are exported from the framework package, so schema-generating code is fully typed.
