# TelePortal GDS — Sample App

End-to-end Next.js App Router project that consumes the local `teleportal-gds` package via a `file:../..` link.

## Run

```bash
# 1. Build the library first (from repo root)
cd ../..
nvm use 24
npm run build

# 2. Install example deps + start dev server
cd examples/next-app
npm install
npm run dev
```

Open <http://localhost:3000> — you'll be redirected to `/applications/demo` (the seeded sample application).

## What's included

- **One application** (`demo`) with one journey (`personal-details`) containing two forms (name, date of birth), a summary page, and a confirmation page.
- All four schema types in [content/](./content/applications/demo/schemas/), seeded into the in-memory adapter on first request.
- The five `page.tsx` files showing the canonical wiring (task list, journey root redirect, form, summary, confirmation).

## Switching to Azure

Edit [app/_storage.ts](./app/_storage.ts) — replace the seed loop with:

```ts
import { setStorageAdapter, createAzureBlobStorageAdapter } from 'teleportal-gds';

setStorageAdapter(
  createAzureBlobStorageAdapter({
    accountUrl: process.env.AZURE_STORAGE_ACCOUNT_URL!,
    containerName: process.env.AZURE_STORAGE_CONTAINER!,
  }),
);
```

Pre-upload the sample schemas from [content/](./content) to your blob container at the same paths.

## Caveats

- In-memory storage = state vanishes on dev server restart. Each cold start re-seeds schemas; submitted answers are lost.
- The library is consumed via `file:../..`, which copies `dist/` into `node_modules/teleportal-gds/`. Re-run `npm run build` in the parent project if library code changes, then `npm install` here to refresh the link.
