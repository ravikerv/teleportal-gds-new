---
sidebar_position: 6
title: Navigation Tokens
---

# Navigation Tokens

Everywhere a schema names a destination — `next`, `back`, `nextWhen[].then`, `redirectIfMissing.to`, `secondaryLinks[].href`, `HubItem.link` — it uses one shared token vocabulary. The framework's `navigation.utils` resolves tokens to URLs; two tokens with side effects are resolved by server actions instead.

## The vocabulary

| Token | Resolves to | Notes |
| --- | --- | --- |
| `{formId}` | `/applications/{app}/journeys/{journey}/{formId}` | **Default**: any token that isn't listed below is treated as a form page in the *current* journey. |
| `summary` | `/…/journeys/{journey}/summary` | The current journey's [summary page](./summary-schema.md). |
| `confirmation` | `/…/journeys/{journey}/confirmation` | The current journey's [confirmation page](./confirmation-schema.md). |
| `task-list` | `/applications/{app}` | The application root — the [master task list](./task-list-schema.md). |
| `journey-root` | `/…/journeys/{journey}` | The current journey's root: its hub, sub-task-list, or first form. |
| `journey:{journeyId}` | `/…/journeys/{journeyId}` | **Cross-journey link** — the root of another journey. Example: `"back": "journey:activities"`. |
| `add-instance:{journeyId}` | *(server action)* | Start a **new entry** in a [looping journey](./form-schema.md#looping-journeys): mints a fresh `_id`, then enters that journey's first form with `?instance={id}`. |
| `parent-summary` | *(server action)* | From inside a looping journey: go to the **parent journey's summary** (per `looping.parentJourneyId`). Used as the last form's `next`. |

## Where each token is valid

| Context | Allowed tokens |
| --- | --- |
| `FormPage.next`, `nextWhen[].then` | All of the above. |
| `FormPage.back`, `HubPage.back`, `SummarySchema.back`, `TaskListJourneyPage.back` | Everything except the two action tokens (`add-instance:`, `parent-summary`). |
| `redirectIfMissing.to`, `secondaryLinks[].href`, `HubItem.link` | URL-resolvable tokens (no action tokens). |
| `SummarySchema.next`, `HubPage.next` | URL-resolvable tokens; the submit additionally marks the journey completed. |
| `TaskListFooterAction.redirectTo` | **Not a token** — a plain URL/path (e.g. `/applications/demo`). |

The two action tokens (`add-instance:`, `parent-summary`) need server-side side effects or context, so `resolveNextPath` deliberately throws if a renderer tries to turn them into plain links — they only work as form-submit destinations, where `formActions` handles them.

## Worked example

The occupier flow from the demo app stitches four token kinds together:

```json
{
  "formId": "are-you-occupier",
  "title": "Are you the occupier of the land?",
  "back": "journey:activities",
  "next": "summary",
  "nextWhen": [
    { "fieldId": "isOccupier", "value": "no", "then": "add-instance:occupier-details" }
  ]
}
```

- Answer **Yes** → default `next` → the journey's own summary.
- Answer **No** → `add-instance:occupier-details` → a fresh entry in the looping `occupier-details` journey.
- That looping journey's last form has `"next": "parent-summary"` → back to `occupier-of-the-land`'s summary, which lists every occupier entry.
- The back link escapes to a sibling journey with `journey:activities`.
