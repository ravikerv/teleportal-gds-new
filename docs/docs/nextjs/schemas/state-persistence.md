---
sidebar_position: 7
title: State & Persistence
---

# State & Persistence

These files are **written by the framework, never authored by hand** — but understanding them is essential for debugging, integrations, and writing `valueFrom` paths.

## `parent.json` (`ParentState`)

The application-wide canonical state, at `applications/{applicationId}/parent.json`:

```json
{
  "applicationId": "demo",
  "journeys": {
    "contact-details": {
      "applicationId": "demo",
      "journeyId": "contact-details",
      "status": "completed",
      "answers": {
        "name-page": { "firstName": "Ada", "lastName": "Lovelace" }
      },
      "updatedAt": "2026-07-20T12:00:00Z"
    },
    "occupier-details": {
      "applicationId": "demo",
      "journeyId": "occupier-details",
      "status": "in-progress",
      "answers": {},
      "entries": [
        {
          "_id": "e1a2b3",
          "answers": {
            "details-page": { "firstName": "Grace", "email": "grace@example.org" },
            "consent-page": { "hasConsent": "yes" }
          },
          "updatedAt": "2026-07-20T12:05:00Z"
        }
      ],
      "updatedAt": "2026-07-20T12:05:00Z"
    }
  },
  "system": {
    "referenceId": "REF-DEMO-1L8X2KC"
  },
  "updatedAt": "2026-07-20T12:05:00Z"
}
```

| Property | Type | Meaning |
| --- | --- | --- |
| `applicationId` | `string` | The owning application. |
| `journeys` | `Record<journeyId, JourneyState>` | Every journey's state, keyed by journey id. |
| `system` | `object` | Engine-managed and integration-written values addressed by `system.{key}` paths — most notably `referenceId`. |
| `updatedAt` | `string` | ISO-8601 timestamp of the last write. |

## Per-journey state (`JourneyState`)

| Property | Type | Meaning |
| --- | --- | --- |
| `applicationId` / `journeyId` | `string` | Identity. |
| `status` | `'not-started' \| 'in-progress' \| 'completed' \| 'cannot-start'` | Drives the task-list tag. Saving any answer moves it to `in-progress`; confirming the summary/hub moves it to `completed`. |
| `answers` | `Record<formId, Record<fieldId, value>>` | The journey's flat answers — what `{formId}.{fieldId}` paths resolve against. Checkbox answers are string arrays; datepicker answers are ISO `YYYY-MM-DD` strings; `inputType: "number"` answers are numbers. |
| `entries` | `JourneyEntry[]` | Only for [looping journeys](./form-schema.md#looping-journeys): repeatable records, each with an engine-minted `_id`, its own `answers` bag, and `updatedAt`. |
| `updatedAt` | `string` | Last write. |

## Denormalised per-journey blob

`applications/{applicationId}/data/journeys/{journeyId}.json` holds an identical copy of `parent.journeys[journeyId]`.

- **Reads** pull from this per-journey file (small, hot).
- **Writes** update both `parent.json` (canonical) and the per-journey blob in the same save — including cross-journey writes like abandoned-branch clearing, which re-syncs every touched journey's denormalised blob.

## Optimistic concurrency

Every loaded blob carries its **ETag** (`LoadedBlob<T> = { data, etag }`). Writes to `parent.json` pass the ETag as `If-Match`, so two racing submits can't silently overwrite each other — the loser gets a conflict and re-reads.

## Draft round-trips (transient)

`applications/{applicationId}/data/journeys/{journeyId}/_drafts/{formId}.json`

When a form submit **fails validation**, the framework writes the just-typed values plus the error map here, then redirects back to the same form URL. The next render of that page consumes the draft (read **and delete**) to re-display the user's values with inline errors — all server-side, no client state. A successful save clears any stale draft.

## Write pipeline (what one submit does)

1. `submitFormAction` validates the POST against the Yup schema built from the page's `validation` blocks.
2. On failure → write draft, redirect back (step above).
3. On success → `saveAnswers` (or `saveEntryAnswers` for looping instances):
   - merges the page's answers into the journey state,
   - diffs the old vs new branching outcome and **clears abandoned branches** (including resetting child journeys entered via `add-instance:`/`journey:` targets),
   - bumps `status` to `in-progress`,
   - writes `parent.json` (ETag-checked) + every touched per-journey blob.
4. Resolves the effective `next` (evaluating `nextWhen` first-match-wins) and redirects.
