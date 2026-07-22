---
sidebar_position: 5
title: Confirmation Schema
---

# `confirmation-schema.json` — Confirmation Schema

The post-submit **confirmation panel** — the green GOV.UK panel with a reference number, plus "what happens next" content. One file per journey (optional) at:

```
applications/{applicationId}/schemas/journeys/{journeyId}/confirmation-schema.json
```

Rendered at the fixed route `/journeys/{journeyId}/confirmation`, usually reached by a summary page whose `next` is `"confirmation"`.

## Example

```json
{
  "journeyId": "personal-details",
  "panelTitle": "Application complete",
  "referenceLabel": "Your reference number",
  "referenceFrom": "system.referenceId",
  "nextStepsMarkdown": "We'll email you within 5 working days.\n\nIf you do not hear from us, contact support."
}
```

## Properties (`ConfirmationSchema`)

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `journeyId` | `string` | Yes | Must match the owning journey. |
| `panelTitle` | `string` | Yes | The bold title inside the green confirmation panel. |
| `referenceLabel` | `string` | Yes | Label shown above the reference number inside the panel (e.g. "Your reference number"). |
| `referenceFrom` | `string` | Yes | Path into parent state, [same syntax](./overview.md#the-valuefrom-path-syntax) as `valueFrom`. Almost always `"system.referenceId"`. |
| `nextStepsMarkdown` | `string` | Yes | Body content below the panel. Currently split on blank lines into paragraphs; full markdown (lists, links) is a planned addition. |
| `schemaVersion` | `string` | No | Reserved for migrations. |

## The reference number

When a journey is marked completed and no reference exists yet, the framework auto-issues a placeholder into `parent.system.referenceId` with the shape:

```
REF-{applicationSlug}-{base36 timestamp}
```

Real integrations should overwrite `parent.system.referenceId` from a backend case-management system **before** completion so the citizen sees the genuine reference. Because `referenceFrom` is just a path, you can also point it at any other `system.*` key your integration writes.

## Rendering

The panel renders through the active design system's `Panel` component (GOV.UK `govuk-panel--confirmation` by default), so a client design system restyles it automatically — see [Design-system adapters](../../monorepo/components-library.md#design-system-adapters).
