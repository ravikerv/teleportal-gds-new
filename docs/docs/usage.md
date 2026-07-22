---
sidebar_position: 2
title: Usage
---

# Usage

A complete walkthrough of wiring TelePortal GDS into a Next.js App Router project.

## Install

```bash
npm install teleportal-gds
npm install govuk-frontend          # GovUK CSS — peer dep
npm install yup                     # validation runtime — peer dep
# Azure adapter (optional, only if you persist to Azure Blob):
npm install @azure/storage-blob @azure/identity
```

Peer dependencies you should already have for a Next.js 15 / 16 App Router project: `react@^19`, `react-dom@^19`, `next@^15 || ^16`.

## 1. Import the GovUK CSS once

In your Next.js root layout (`app/layout.tsx`):

```tsx
import 'govuk-frontend/dist/govuk/govuk-frontend.min.css';
```

The library writes the documented GovUK class names — the CSS is provided by the official `govuk-frontend` package.

## 2. Configure storage

By default, TelePortal GDS uses an **in-memory storage adapter** (state vanishes on process restart) — fine for tests and quick demos. For production, wire up the Azure adapter at app startup.

### In a Next.js project

Create `app/_storage.ts`:

```ts
import {
  setStorageAdapter,
  createAzureBlobStorageAdapter,
} from 'teleportal-gds';

let initialised = false;

export function ensureStorageConfigured(): void {
  if (initialised) return;
  setStorageAdapter(
    createAzureBlobStorageAdapter({
      accountUrl: process.env.AZURE_STORAGE_ACCOUNT_URL!,
      containerName: process.env.AZURE_STORAGE_CONTAINER!,
    }),
  );
  initialised = true;
}
```

Call `ensureStorageConfigured()` at the top of every Server Component and Server Action that touches blob storage. (One call per request boundary is cheap — `initialised` short-circuits subsequent ones.)

### Authentication

The Azure adapter uses `DefaultAzureCredential` from `@azure/identity`. In production this resolves to **Managed Identity**; locally it resolves to whoever you authenticated as via `az login`. The Managed Identity (or `az` user) needs the **Storage Blob Data Contributor** RBAC role on the container.

No connection strings, no SAS tokens — anywhere.

## 3. Author your journey schemas

Per the [JSON Schema Reference](./nextjs/schemas/overview.md), each journey has up to four JSON files. Upload them to the container at the documented paths:

```
applications/{applicationId}/
├── parent.json                                  # auto-managed by the library
├── schemas/
│   ├── task-list-schema.json
│   └── journeys/
│       └── personal-details/
│           ├── form-schemas.json
│           ├── summary-schema.json
│           └── confirmation-schema.json
└── data/
    └── journeys/
        └── personal-details.json                # auto-managed
```

The folder layout mirrors Next.js routing — see step 4.

## 4. Wire up Next.js pages

The consuming app needs four route handlers per application — task list, form pages, summary, confirmation. Each is a thin Server Component that calls a `load*PageState` helper, then hands the result to `SchemaRenderer`.

### Task list

`app/applications/[applicationId]/page.tsx`:

```tsx
import { loadTaskListPageState, SchemaRenderer } from 'teleportal-gds';
import { ensureStorageConfigured } from '@/app/_storage';

export default async function TaskListPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  ensureStorageConfigured();
  const { applicationId } = await params;
  const { schema, parent } = await loadTaskListPageState(applicationId);
  return (
    <SchemaRenderer
      schemaType="task-list"
      applicationId={applicationId}
      schema={schema}
      parent={parent}
    />
  );
}
```

### Form page

`app/applications/[applicationId]/journeys/[journeyId]/[formId]/page.tsx`:

```tsx
import { loadFormPageState, SchemaRenderer } from 'teleportal-gds';
import { ensureStorageConfigured } from '@/app/_storage';

export default async function FormPage({
  params,
}: {
  params: Promise<{ applicationId: string; journeyId: string; formId: string }>;
}) {
  ensureStorageConfigured();
  const { applicationId, journeyId, formId } = await params;
  const { schema, values, errors } = await loadFormPageState(
    applicationId,
    journeyId,
    formId,
  );
  return (
    <SchemaRenderer
      schemaType="form"
      applicationId={applicationId}
      journeyId={journeyId}
      schema={schema}
      values={values}
      errors={errors}
    />
  );
}
```

The form posts to the bundled `submitFormAction`. On validation failure the library writes a transient draft, redirects back to the same URL, and re-renders with errors — no client state involved.

### Journey root (redirect to first form)

`app/applications/[applicationId]/journeys/[journeyId]/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import {
  BLOB_PATHS,
  getFirstFormPage,
  readBlob,
  resolveNextPath,
} from 'teleportal-gds';
import type { FormSchema } from 'teleportal-gds';
import { ensureStorageConfigured } from '@/app/_storage';

export default async function JourneyEntry({
  params,
}: {
  params: Promise<{ applicationId: string; journeyId: string }>;
}) {
  ensureStorageConfigured();
  const { applicationId, journeyId } = await params;
  const blob = await readBlob<FormSchema>(
    BLOB_PATHS.journeyFormSchemas(applicationId, journeyId),
  );
  const first = getFirstFormPage(blob.data);
  if (!first) throw new Error(`Journey ${journeyId} has no forms`);
  redirect(resolveNextPath(applicationId, journeyId, first.formId));
}
```

The TaskList wrapper links to this URL; this page resolves to the journey's first form.

### Summary

`app/applications/[applicationId]/journeys/[journeyId]/summary/page.tsx`:

```tsx
import { loadSummaryPageState, SchemaRenderer } from 'teleportal-gds';
import { ensureStorageConfigured } from '@/app/_storage';

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ applicationId: string; journeyId: string }>;
}) {
  ensureStorageConfigured();
  const { applicationId, journeyId } = await params;
  const { schema, parent } = await loadSummaryPageState(applicationId, journeyId);
  return (
    <SchemaRenderer
      schemaType="summary"
      applicationId={applicationId}
      journeyId={journeyId}
      schema={schema}
      parent={parent}
    />
  );
}
```

### Confirmation

`app/applications/[applicationId]/journeys/[journeyId]/confirmation/page.tsx`:

```tsx
import { loadConfirmationPageState, SchemaRenderer } from 'teleportal-gds';
import { ensureStorageConfigured } from '@/app/_storage';

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ applicationId: string; journeyId: string }>;
}) {
  ensureStorageConfigured();
  const { applicationId, journeyId } = await params;
  const { schema, parent } = await loadConfirmationPageState(
    applicationId,
    journeyId,
  );
  return (
    <SchemaRenderer
      schemaType="confirmation"
      applicationId={applicationId}
      journeyId={journeyId}
      schema={schema}
      parent={parent}
    />
  );
}
```

That's the entire integration. Five `page.tsx` files, no per-form code.

## What you're never expected to write

- **Form rendering** — `<SchemaRenderer schemaType="form" />` does it.
- **Validation logic** — Yup schemas are built from the JSON `validation` block.
- **Server actions for save/submit** — `submitFormAction` and `confirmSummaryAction` ship with the library.
- **Direct blob calls** — everything goes through `data.utils` (which goes through `storage.utils`).

## Custom storage adapter

If you need a non-Azure backend (S3, filesystem, an in-memory store seeded for tests), implement the `StorageAdapter` interface and call `setStorageAdapter()`:

```ts
import {
  setStorageAdapter,
  type StorageAdapter,
} from 'teleportal-gds';

const myAdapter: StorageAdapter = {
  async read(path) { /* … */ },
  async tryRead(path) { /* … */ },
  async write(path, data, ifMatchEtag) { /* … */ },
  async exists(path) { /* … */ },
  async delete(path) { /* … */ },
};

setStorageAdapter(myAdapter);
```

The adapter is held in a `Symbol.for('teleportal-gds.storageAdapter')` global, so it's process-wide and shared across all bundled chunks of the library.
