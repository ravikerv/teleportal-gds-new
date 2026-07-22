---
sidebar_position: 1
title: Monorepo Overview
---

# Monorepo Overview

TelePortal GDS is an npm-workspaces monorepo. Each package has a single responsibility, and they compose into the full product: author journeys visually (or as JSON, or from a Mural board with AI), render them with any design system, persist to Azure.

```
gds/
├── packages/
│   ├── teleportal-gds/          # THE FRAMEWORK — schema engine, shared utils,
│   │                            #   component wrappers, design-system adapters
│   ├── journey-builder/         # Visual editor (React 19 + Vite + React Flow)
│   └── mural-import-service/    # AI companion service (Mural MCP → Claude → schemas)
├── examples/
│   └── next-app/                # Reference Next.js consumer (the demo application)
├── docs/                        # This Docusaurus site
└── ARCHITECTURE.md              # The architectural contract, §-referenced from code
```

## The packages

| Package | What it is | Docs |
| --- | --- | --- |
| `teleportal-gds` | The **framework**: everything shared — the schema-driven rendering engine, the `shared/utils` middleware (data, storage, navigation, validation, schema, request), the React component wrapper library, and the design-system adapter registry | [Framework](./framework.md) · [Components Library](./components-library.md) |
| `journey-builder` | The **visual editor**: drag-and-drop canvas, inspectors, master journey map, full journey preview with design-system switcher, import/export, AI Mural import UI | [Journey Builder](./journey-builder.md) |
| `mural-import-service` | Node companion service that turns a Mural board into a validated schema bundle via an LLM (provider-abstracted; Claude by default, mock for keyless dev) | [Journey Builder › AI import](./journey-builder.md#ai-import-from-mural) |
| `examples/next-app` | The reference consumer showing the five-route integration and a demo application exercising branching, hubs, sub-task-lists, and looping | [Next.js Project](../nextjs/project-structure.md) |
| `docs` | This site | — |

## How they depend on each other

```
                    ┌──────────────────────┐
                    │   examples/next-app  │  (consumer)
                    └──────────┬───────────┘
                               │ imports
                               ▼
┌─────────────────────────────────────────────────────┐
│                 teleportal-gds (framework)          │
│  engine ─▶ design-system adapters ─▶ components     │
│     └────────▶ shared/utils ─▶ storage adapters     │
└─────────────────────────────────────────────────────┘
        ▲                                   ▲
        │ shares schema types & semantics   │
┌───────┴──────────┐              ┌─────────┴──────────┐
│  journey-builder │ ◀── zip ──── │ mural-import-service│
│  (authoring)     │    bundle    │ (AI generation)     │
└──────────────────┘              └─────────────────────┘
```

- The **Journey Builder** authors exactly the JSON the framework renders — its preview implements the same navigation-token and branch-clearing semantics, so what you see in the builder is what the framework will do.
- The **Mural import service** outputs the same schema bundle layout the builder's Import buttons accept.
- The **example app** consumes the framework as a versioned dependency — the way any client project would.

## Toolchain

- **npm workspaces** — single `package-lock.json` at the root; run package scripts with `npm run <script> -w <package>`.
- **TypeScript strict** everywhere.
- **Vitest** for unit tests in every package; **Storybook** for the component wrappers; **Docusaurus** for these docs.
- Node 24 (see the repo's `.nvmrc`).
