---
slug: /
sidebar_position: 1
title: Introduction
---

# TelePortal GDS

A versioned React component library that wraps the **GovUK Design System** and renders complete user journeys (form pages, summary, task list, confirmation) from JSON schemas. Built for Next.js App Router projects using Server Components and Server Actions only — all state lives on the server and is persisted to Azure Blob Storage.

## What it solves

Government-style services in Next.js typically look like a sea of bespoke `page.tsx` files, each hand-rolling its own GovUK markup, validation, and persistence. TelePortal GDS replaces that with **JSON schema files** for each journey, plus a small set of `<SchemaRenderer />` calls. The library does the rendering; developers only edit JSON.

## Core principles

These are non-negotiable design rules — every change to the library is checked against them:

1. **Server-side JavaScript only.** No `useState`, `useEffect`, `useContext`, or any client hooks for state. No `'use client'` directives unless required by a leaf interactive widget. All state lives on the server.
2. **JSON schema driven.** Developers should never write rendering code. Component selection, layout, validation, and navigation flow from `form-schemas.json`, `summary-schema.json`, `task-list-schema.json`, and `confirmation-schema.json`.
3. **Wrapper components only.** GovUK markup is never exposed directly. Each consumed component is a thin wrapper in `src/components/` with a stable React-idiomatic API.
4. **The shared/utils layer is the only middleware.** `data.utils`, `request.utils`, `storage.utils`, `navigation.utils`, `validation.utils`, `schema.utils` — all cross-cutting concerns live there. Components and the engine call utils, never the other way round.
5. **Validation = Yup, always**, built dynamically from the schema.
6. **Parent + per-journey data stay in sync.** Every save updates `parent.json` and the per-journey JSON atomically; cross-journey dependencies are resolved in `data.utils`.
7. **Blob auth = Managed Identity.** No connection strings or SAS tokens in code; `DefaultAzureCredential` is the only auth surface.
8. **Tooling**: Storybook for every wrapper, Docusaurus for these docs, TypeScript strict mode.

## Architecture at a glance

```
┌──────────────────────────────────────────────┐
│            CONSUMING NEXT.JS PROJECT         │
│  - File-based routing mirrors blob layout    │
│  - Imports teleportal-gds as a versioned dep │
│  - Provides JSON schemas (locally + blob)    │
└──────────────────┬───────────────────────────┘
                   │ consumes
                   ▼
┌──────────────────────────────────────────────┐
│         TELEPORTAL GDS LIBRARY               │
│                                              │
│   SCHEMA ENGINE  (JSON → component renderer) │
│   SHARED / UTILS (data, storage, …)          │
│   COMPONENT WRAPPERS (over GovUK)            │
└──────────────────┬───────────────────────────┘
                   │ server-side I/O
                   ▼
┌──────────────────────────────────────────────┐
│                AZURE BLOB STORAGE            │
│  - JSON schemas (4 types per journey)        │
│  - Parent state + per-journey state          │
│  - Authenticated via Managed Identity        │
└──────────────────────────────────────────────┘
```

The four schema types per journey:

- **`form-schemas.json`** — every form page in a journey, its fields, validation, and `next` token.
- **`summary-schema.json`** — the "Check your answers" page; rows pull values from parent state via `valueFrom` paths.
- **`task-list-schema.json`** — application-level list of journeys and their statuses.
- **`confirmation-schema.json`** — the post-submit panel with a reference id pulled from `parent.system.referenceId`.

See the [Schema Reference](./schema-reference.md) for the exact shapes.

## When to use it

- You're building a Next.js App Router application that mirrors GOV.UK service patterns (multi-page journeys, save-and-continue, summary, confirmation).
- You want JSON to be the single source of truth for what each page contains.
- You're deploying to Azure with Managed Identity, or you can run an in-memory storage adapter in dev / tests.

## Where to next

- **[Usage](./usage.md)** — install the library, wire it into Next.js pages, configure storage.
- **[Schema Reference](./schema-reference.md)** — the full shape of every schema type, with examples.
