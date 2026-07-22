---
sidebar_position: 4
title: Journey Builder
---

# Journey Builder — `packages/journey-builder`

The visual editor for journeys. A BA or designer builds the same JSON the framework renders — without writing JSON. React 19 + Vite + Tailwind, with the canvas built on **React Flow 12** and state in **Zustand** (undo/redo via the zundo temporal middleware).

```bash
npm run dev -w journey-builder     # http://localhost:5173
```

## What it does

| Area | Capability |
| --- | --- |
| **Canvas** (`src/canvas/`) | Drag-and-drop flow editing with custom-designed nodes per page kind (form, hub, task-list, summary), styled edges for `next`/`nextWhen`/`back`, helper alignment lines, snap-to-grid, an auto-**Tidy** layout (dagre), and inline validation badges on nodes with issues. |
| **Palette & project tree** (`src/palette/`) | Add new form pages and other page kinds to any journey; navigate the whole project's journeys and pages. |
| **Inspectors** (`src/inspector/`) | Structured editors for every schema property — form fields (all six types, options, conditionals, validation rules and messages), hub items and sources, sub-task-lists, summaries (header rows + entries blocks), and edge/branching rules. |
| **Master view** (`src/master/`) | The big picture: a **journey map** showing how every journey stitches into the whole application, plus the master task list editor. |
| **Preview** (`src/preview/`) | The Preview button opens the **entire master journey** in a new tab — task list → forms → branching → summaries → confirmation — with working branch logic and abandoned-branch clearing matching framework semantics, and a **design-system switcher** (GOV.UK ↔ NHS.UK) driven by the same adapter concept. |
| **Patterns** (`src/patterns/`) | One-click multi-page recipes: Yes/No branch, looping collection, address lookup. |
| **Validation** (`src/validation/`) | Project-wide referential checks — unresolved `next`/`back`/`then` tokens, duplicate ids, broken `valueFrom` paths, ghost task references — surfaced on the canvas and in the tree. |
| **Persistence** (`src/persistence/`) | **Import folder / Import zip** of a schema bundle, **Export** back to the exact blob layout, with round-trip drift detection. Import order is normalised, so bundles load correctly regardless of file order. |
| **Undo/redo** (`src/store/`) | Every project mutation — including an applied AI import — is one undo step. |

## Schema fidelity

The builder's internal model maps 1:1 onto the framework's schema types (`src/schema/mapping.ts`). What you export is a bundle the framework (and the example Next.js app) consumes directly:

```
applications/{applicationId}/
├── task-list-schema.json
└── {journeyId}/
    ├── form-schemas.json
    └── summary-schema.json
```

The preview implements the same [navigation tokens](../nextjs/schemas/navigation-tokens.md) and clearing rules as the framework, so builder-preview behaviour is a faithful rehearsal of production behaviour.

## AI import from Mural

The **Import from Mural** button turns a Mural board into a reviewable journey draft:

1. A BA lays out the journey in Mural following the [Mural conventions](../mural-conventions.md) (frames = journeys, `[form]`/`[hub]`/`[task-list]`/`[summary]` prefixes, labelled arrows for branches).
2. The companion service (`packages/mural-import-service`) fetches the board via **Mural's MCP server**, has an LLM generate the schema bundle, **validates every reference**, and runs one self-repair round on errors.
3. The dialog shows the AI's **assumptions** and any unresolved issues; **Apply** loads the bundle onto the canvas as a normal (undo-able) project load.

The LLM sits behind an `LlmProvider` interface — Claude by default, a mock provider for keyless demos, and any OpenAI-compatible endpoint (e.g. GitHub Models) as a one-class swap. Service configuration:

```bash
# packages/mural-import-service
LLM_PROVIDER=mock npm run dev          # keyless plumbing test on :8787
# real runs: ANTHROPIC_API_KEY + MURAL_MCP_URL + MURAL_MCP_TOKEN
```

The same conventions also work interactively via the repo's `/mural-import` skill in any MCP-capable agent (Claude Code, VS Code agent mode).

## Tests

`npm test -w journey-builder` (Vitest) covers schema mapping round-trips, import order-independence, pattern generation, and validation rules.
