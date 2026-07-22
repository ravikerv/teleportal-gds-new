---
sidebar_position: 3
title: Summary Schema
---

# `summary-schema.json` — Summary Schema

The **"Check your answers"** page for a journey. One file per journey (optional — only journeys with a summary page need one) at:

```
applications/{applicationId}/schemas/journeys/{journeyId}/summary-schema.json
```

The page is always addressable at the fixed route `/journeys/{journeyId}/summary` — there is no `formId`, because the route is conventional (mirroring `confirmation`). It renders static **header rows**, an optional **repeatable-entries block** for a looping child journey, and a submit that marks the journey **completed** before navigating to `next`.

## Real example

From the demo application's `occupier-of-the-land` journey:

```json
{
  "journeyId": "occupier-of-the-land",
  "title": "Occupier of the land",
  "back": "journey:activities",
  "next": "journey:activities",
  "headerRows": [
    {
      "key": "Are you the occupier of the land?",
      "valueFrom": "are-you-occupier.isOccupier",
      "changeLink": "are-you-occupier"
    }
  ],
  "entries": {
    "fromJourneyId": "occupier-details",
    "groupLabel": "Occupier of the land {n}",
    "addAnotherLabel": "Add another occupier of the land",
    "removeLabel": "Remove",
    "showWhen": { "valueFrom": "are-you-occupier.isOccupier", "equals": "no" },
    "rows": [
      {
        "key": "Occupier's name",
        "valueFrom": "details-page.firstName",
        "valueFromAll": ["details-page.firstName", "details-page.lastName"],
        "changeFormId": "details-page"
      },
      {
        "key": "Do you have the occupier's consent?",
        "valueFrom": "consent-page.hasConsent",
        "changeFormId": "consent-page"
      }
    ]
  },
  "submitLabel": "Continue",
  "footerActions": [
    { "label": "Save as draft", "actionId": "save-as-draft", "variant": "secondary", "redirectTo": "/applications/demo" }
  ]
}
```

## Top level (`SummarySchema`)

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `journeyId` | `string` | Yes | Must match the owning journey. |
| `title` | `string` | Yes | Page `<h1>` (e.g. "Check your answers"). |
| `caption` | `string` | No | Smaller heading above the title. |
| `description` | `string` | No | Text under the title. |
| `back` | `string` | No | Back-link target — [navigation-token](./navigation-tokens.md) syntax. |
| `next` | `string` | Yes | Where the submit navigates **after marking the journey complete**. Typically `"confirmation"`, `"task-list"`, or `"journey:{jid}"`. |
| `headerRows` | `SummaryRow[]` | No | Static rows shown above any entries block — e.g. the Yes/No answer that gates the loop. |
| `entries` | `SummaryEntriesBlock` | No | Repeatable-entry listing for a looping child journey — see below. |
| `submitLabel` | `string` | No | Submit button label (default "Confirm and continue"). |
| `footerActions` | `TaskListFooterAction[]` | No | Extra buttons below the submit (Save as draft, etc.) — same shape as [task-list footer actions](./task-list-schema.md#footer-actions-tasklistfooteraction). |
| `schemaVersion` | `string` | No | Reserved for migrations. |

## Header rows (`SummaryRow`)

Each row shows a label, the resolved answer, and a "Change" link that deep-links back to the source page.

| Property | Type | Meaning |
| --- | --- | --- |
| `key` | `string` | Visible row label. |
| `valueFrom` | `string` | Path into parent state — [`{formId}.{fieldId}` or `system.{key}`](./overview.md#the-valuefrom-path-syntax). Resolves against the **current journey's** saved answers. |
| `changeLink` | `string` | The `formId` the "Change" link jumps to. After the user changes the answer and resubmits, branching (`nextWhen`) re-evaluates and [abandoned-branch clearing](./form-schema.md#branching-nextwhen) applies. |

## `entries` — repeatable-entry block

Enumerates the entries of a **looping child journey** (one whose `form-schemas.json` sets `looping.parentJourneyId` to this journey). Each entry renders as its own group of rows with Change/Remove actions, followed by an "Add another …" call to action.

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fromJourneyId` | `string` | Yes | The looping journey to enumerate. Its `looping.parentJourneyId` must point back at **this** journey. |
| `groupLabel` | `string` | Yes | Per-entry heading template; `{n}` is replaced with the 1-based index — e.g. `"Occupier of the land {n}"` → "Occupier of the land 1", "… 2". |
| `rows` | `SummaryEntryRow[]` | Yes | Rows rendered for each entry — see below. |
| `addAnotherLabel` | `string` | Yes | The "Add another …" link text. Clicking it mints a fresh entry (the `add-instance:` flow) and enters the looping journey's first form. |
| `removeLabel` | `string` | No | Remove-link text. The link renders **only when there is more than one entry**, and leads to the engine's built-in remove-confirmation page. |
| `showWhen` | `{ valueFrom, equals? }` | No | Gate for the whole block. It renders only when `valueFrom` resolves non-empty and (if `equals` is set) equals that value. E.g. only list occupiers when the header answer was `"no"`. |

### Entry rows (`SummaryEntryRow`)

Paths here are rooted in **each entry's own answers** (`entries[i].answers`), not the journey's flat answers.

| Property | Type | Meaning |
| --- | --- | --- |
| `key` | `string` | Row label, e.g. "Occupier's name". |
| `valueFrom` | `string` | `{formId}.{fieldId}` path within the entry. |
| `valueFromAll` | `string[]` | Optional: multiple paths whose non-empty resolutions are joined with a space — e.g. first name + last name as one "Name" row. When set, it wins over `valueFrom` for display. |
| `changeFormId` | `string` | The looping journey's page to deep-link "Change" to. The link carries the entry's `?instance={id}` so the edit lands in the right entry. |

## Behaviour notes

- **Submitting** the summary marks the journey `completed` in parent state, then navigates to `next`.
- If the journey is reopened later (e.g. a Change link), its status returns to `in-progress` until the summary is confirmed again.
- Radio/checkbox answers render their **stored `value`** (e.g. `yes`) — pick option values that read acceptably, or design labels/values accordingly.
