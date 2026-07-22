---
sidebar_position: 1
title: Project Structure
---

# The Next.js Project — Code Structure

A consuming application is deliberately tiny: a handful of thin route files that mirror the blob layout, plus the JSON schemas. The reference implementation lives in the monorepo at `examples/next-app`.

## Folder layout

```
examples/next-app/
├── app/
│   ├── layout.tsx                  # imports GOV.UK CSS once, renders Header/Footer
│   ├── page.tsx                    # dashboard / entry point
│   ├── _storage.ts                 # one-time storage adapter configuration
│   ├── _providers.ts               # optional: registered options providers (dynamic selects)
│   └── applications/[applicationId]/
│       ├── page.tsx                                    # task list
│       ├── debug/page.tsx                              # dev-only state inspector
│       └── journeys/[journeyId]/
│           ├── page.tsx                                # journey root (hub / sub-task-list / redirect)
│           ├── [formId]/page.tsx                       # every form page
│           ├── summary/page.tsx                        # check your answers
│           └── confirmation/page.tsx                   # confirmation panel
└── schemas/
    └── applications/demo/
        ├── task-list-schema.json
        ├── contact-details/form-schemas.json
        └── activities/
            ├── form-schemas.json                       # sub-task-list journey
            └── occupier-of-the-land/
                ├── form-schemas.json                   # branching (nextWhen)
                ├── summary-schema.json                 # headerRows + entries
                └── occupier-details/form-schemas.json  # looping child journey
```

Three things to notice:

1. **The route tree mirrors the blob layout** (`applications/{id}/journeys/{jid}/{formId}`), which mirrors the URL space. One mental model everywhere — see [`BLOB_PATHS`](./schemas/overview.md#where-the-files-live).
2. **There are only five meaningful `page.tsx` files** — task list, journey root, form, summary, confirmation. They are the same five for *every* application, no matter how many journeys or pages exist. New pages are added by editing JSON, never by adding routes.
3. **Everything is a Server Component.** No `'use client'`, no hooks, no client state. Forms POST to bundled Server Actions.

## What a route file looks like

Every route follows the same three-line pattern — configure storage, load state, render:

```tsx
import { loadFormPageState, SchemaRenderer } from 'teleportal-gds';
import { ensureStorageConfigured } from '@/app/_storage';

export default async function FormPage({ params }) {
  ensureStorageConfigured();
  const { applicationId, journeyId, formId } = await params;
  const { schema, values, errors } = await loadFormPageState(applicationId, journeyId, formId);
  return (
    <SchemaRenderer schemaType="form" applicationId={applicationId}
      journeyId={journeyId} schema={schema} values={values} errors={errors} />
  );
}
```

The full wiring for all five routes (plus storage and custom adapters) is in [Usage](../usage.md).

## The JSON schemas in the project

The `schemas/` folder is the application's **content**. In development the folder can be served by the in-memory adapter seeded from disk; in production the same tree is uploaded to Azure Blob Storage. Either way the four schema types drive everything:

| Schema | What it controls | Detailed reference |
| --- | --- | --- |
| `form-schemas.json` | Pages, fields, validation, branching, looping | [Form Schema](./schemas/form-schema.md) |
| `summary-schema.json` | Check-your-answers rows and repeatable-entry listings | [Summary Schema](./schemas/summary-schema.md) |
| `task-list-schema.json` | The application's journey list, sections, dependencies | [Task List Schema](./schemas/task-list-schema.md) |
| `confirmation-schema.json` | The completion panel and reference number | [Confirmation Schema](./schemas/confirmation-schema.md) |

The demo application exercises every advanced feature: the `activities` journey is a **sub-task-list page**, `occupier-of-the-land` uses **branching** (`nextWhen`) and a **summary with entries**, and `occupier-details` is a **looping child journey** entered via `add-instance:`.

## Division of responsibility

| Concern | Lives in |
| --- | --- |
| Which pages exist, their fields, flow, and validation rules | JSON schemas |
| Rendering, validation execution, navigation, persistence, branching/looping mechanics | the framework (`teleportal-gds`) |
| Routing shell, storage configuration, design-system choice, options providers, backend integrations (real reference numbers, submission APIs) | the Next.js project |
