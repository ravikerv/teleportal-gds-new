# Implementation Prompt for Claude (Visual Studio / Claude Code)

## Recommended Model
**Claude Sonnet 4.5** or **Claude Opus 4.7** — Sonnet 4.5 is the workhorse for most coding work and is faster/cheaper; Opus 4.7 is best when you want the deepest reasoning on the architectural pieces (schema engine, parent/journey sync logic). Start with Sonnet 4.5 and escalate to Opus 4.7 for the trickier modules.

## Recommended Tool
**Claude Code** (terminal or VS Code extension) for the build itself — it can read/write files and run commands directly. Use the prompts below as the kickoff message.

---

## Role / System Prompt (paste this once at the start of the session)

```
You are a senior front-end architect implementing TelePortal GDS — a versioned React component
library that wraps the GovUK design system and renders complete user journeys from JSON
schemas.

Hard rules — these are non-negotiable:

1. SERVER-SIDE JAVASCRIPT ONLY in the consuming Next.js project.
   - No useState, useEffect, useContext, or any client hooks for state.
   - No "use client" directives unless absolutely required for a leaf interactive widget,
     and even then, state must round-trip through Server Actions.
   - All state lives on the server and is persisted to Azure Blob Storage.

2. JSON SCHEMA DRIVEN.
   - Developers should never write rendering code. They edit JSON only.
   - All component selection, layout, validation, and navigation flow from the schema files:
     form-schemas.json, summary-schema.json, task-list-schema.json, confirmation-schema.json.

3. WRAPPER COMPONENTS ONLY.
   - Never expose GovUK components directly. Every consumed component is a thin wrapper
     in src/components/ with a stable API.

4. THE SHARED/UTILS LAYER IS THE ONLY MIDDLEWARE.
   - data.utils, request.utils, storage.utils, navigation.utils, validation.utils, schema.utils.
   - All cross-cutting concerns live there. Components and the engine call utils — never the
     other way round.

5. VALIDATION = YUP. Always. Built dynamically from the schema.

6. PARENT + PER-JOURNEY DATA STAY IN SYNC.
   - Every save updates both parent.json and the per-journey JSON in blob storage atomically.
   - Cross-journey dependencies are resolved in data.utils.

7. BLOB STORAGE AUTH = MANAGED IDENTITY.
   - No connection strings, no SAS tokens in code.

8. TOOLING: Storybook for every wrapper component, Docusaurus for docs, TypeScript strict mode.

When in doubt, refer to ARCHITECTURE.md (which I will provide). If a requirement conflicts
with the architecture doc, stop and ask before deviating.

Work iteratively. After each module, summarise what you built, what's left, and any
assumptions you made. Do not invent requirements I haven't given you.
```

---

## Kickoff Prompt (first user message)

```
Read ARCHITECTURE.md in the repo root. Confirm you understand the design, then propose a
build order for Phase 1 in this format:

  Step N — <module name>
    Files: <paths>
    Depends on: <previous steps>
    Deliverable: <what "done" looks like>

Once I approve the order, build step 1. After step 1 is complete, stop and wait for me to
review before starting step 2.

Do not skip ahead. Do not write code outside the agreed step.
```

---

## Suggested Build Order (use this as a sanity check on Claude's proposal)

1. **Project scaffolding** — `package.json`, `tsconfig.json`, folder structure, build config (Vite library mode or tsup).
2. **Types** — `src/shared/types/*` (schema, journey, component types).
3. **Utils layer** — `data.utils`, `storage.utils` (mock first, real Azure later), `navigation.utils`, `validation.utils`, `schema.utils`, `request.utils`.
4. **Component registry** — `src/engine/componentRegistry.ts`.
5. **Wrapper components** — Input, Select, Radio, Checkbox, DatePicker, TextArea, Button, ErrorSummary (with stories for each).
6. **Renderers** — `FormRenderer`, then `SummaryRenderer`, `TaskListRenderer`, `ConfirmationRenderer`.
7. **`SchemaRenderer`** — top-level entry that picks the right sub-renderer.
8. **Azure Blob integration** — `storage.utils` real implementation with `@azure/storage-blob` + `@azure/identity` (Managed Identity).
9. **Storybook setup** — confirm all stories render.
10. **Docusaurus setup** — usage guide + schema reference.
11. **Sample consuming Next.js app** — proves the whole loop end-to-end with sample JSON schemas.

---

## Per-Step Prompt Template

For each step, paste something like:

```
Begin Step <N>: <module name>.

Constraints:
  - Follow the rules in the system prompt.
  - Files to create/modify: <list from build order>
  - When done, give me:
      a) the full file paths you wrote
      b) a one-paragraph summary of design choices
      c) any assumptions you made
      d) what's still TODO before this step is fully production-ready
  - Do not start the next step.
```

---

## Reference Prompts for Tricky Modules

### `data.utils` — parent/journey sync
```
Implement data.utils.ts. It must expose:
  - loadParent(applicationId): Promise<ParentState>
  - loadJourney(applicationId, journeyId): Promise<JourneyState>
  - saveAnswers(applicationId, journeyId, formId, answers): Promise<void>
      → must update BOTH the per-journey JSON and parent.json atomically
      → must run cross-journey dependency resolution before writing
  - resolveDependencies(parent: ParentState): ParentState
      → pure function; given the full parent, returns the parent with derived
        fields recomputed (e.g. journey statuses, conditional visibility flags).

Use storage.utils for all blob I/O. No direct @azure calls here.
Write Vitest unit tests covering: simple save, cross-journey dependent save,
concurrent-write conflict handling.
```

### `SchemaRenderer` — JSON → JSX
```
Implement SchemaRenderer.tsx as a Server Component. It receives:
  - schemaType: 'form' | 'summary' | 'task-list' | 'confirmation'
  - schema: the parsed JSON
  - data: current journey/parent state
  - applicationId, journeyId, formId

It dispatches to the appropriate sub-renderer. Sub-renderers walk the schema
and look up components via componentRegistry. No client hooks. Forms submit
to a Server Action that calls data.utils.saveAnswers and then redirects via
navigation.utils.
```

### `validation.utils` — Yup from schema
```
Implement buildYupSchema(fields: FormField[]): yup.ObjectSchema.
Support: required, minLength, maxLength, pattern (regex string),
min/max for numbers, custom error messages.
Also implement validateAndCollect(schema, data) that returns
{ valid: true, data } or { valid: false, errors: Record<fieldId, message> }
shaped for the ErrorSummary component.
```

---

## What to Hand Claude on Day One

1. `ARCHITECTURE.md` (provided).
2. The system prompt above.
3. The kickoff prompt above.
4. Empty repo (or one with `.gitignore` + `README.md` only).
5. Access to Azure (for the storage step) — or tell it to mock until step 8.

That's the full handoff. Claude should be able to drive Phase 1 from here with you reviewing each step.
