# TelePortal GDS

A versioned React component library that wraps the **GovUK Design System** and renders complete user journeys (form pages, summary, task list, confirmation) from JSON schemas. Designed for Next.js App Router projects using Server Components and Server Actions only — all state lives on the server and is persisted to Azure Blob Storage.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Status

Phase 1 — in progress. Step 1 (project scaffolding) complete.

## Scripts

- `npm run build` — produce ESM + CJS bundles and `.d.ts` declarations into `dist/`.
- `npm run dev` — rebuild on change.
- `npm run typecheck` — `tsc --noEmit` against the strict config.
- `npm test` — run Vitest once.
- `npm run test:watch` — Vitest in watch mode.
- `npm run format` / `format:check` — Prettier.

## Requirements

- Node 20+
- React 19 (peer dependency)
- TypeScript 5.6+ (consumers and contributors)
