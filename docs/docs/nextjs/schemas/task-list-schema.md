---
sidebar_position: 4
title: Task List Schema
---

# `task-list-schema.json` — Task List Schema

The application-level list of journeys — the GOV.UK "task list" pattern. **One file per application** at:

```
applications/{applicationId}/schemas/task-list-schema.json
```

It renders at the application root (`/applications/{applicationId}`) and is usually where a citizen starts and returns between journeys.

## Example

```json
{
  "title": "Apply for a flood risk activity permit",
  "sections": [
    {
      "id": "about-you",
      "title": "About you",
      "tasks": [
        { "id": "contact-details", "label": "Contact details", "status": "not-started" }
      ]
    },
    {
      "id": "the-activity",
      "title": "The activity",
      "tasks": [
        { "id": "activities", "label": "Activities", "status": "not-started", "dependsOn": ["contact-details"] },
        {
          "id": "site-plans",
          "label": "Site plans",
          "type": "nested-journey",
          "journeyRef": "site-plan-journey",
          "status": "not-started",
          "statusLabel": "Cannot start yet"
        }
      ]
    }
  ],
  "footerActions": [
    { "label": "Save and exit", "actionId": "save-and-exit", "variant": "secondary" },
    { "label": "Delete application", "actionId": "delete-application", "variant": "warning" }
  ]
}
```

## Top level (`TaskListSchema`)

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `title` | `string` | Yes | Page `<h1>`. |
| `tasks` | `TaskListItem[]` | One of | Flat, unsectioned task list. |
| `sections` | `TaskListSection[]` | One of | Grouped task list. **When set, takes precedence over `tasks`** (the flat array is ignored). |
| `footerActions` | `TaskListFooterAction[]` | No | Buttons below the list — see [Footer actions](#footer-actions-tasklistfooteraction). |
| `schemaVersion` | `string` | No | Reserved for migrations. |

## Sections (`TaskListSection`)

| Property | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Stable id (React keys, aria). |
| `title` | `string` | Section heading rendered above its own list. |
| `tasks` | `TaskListItem[]` | The section's tasks. |

## Tasks (`TaskListItem`)

A task is either a **regular task** (default) or a **nested-journey task**, discriminated by `type`:

| Property | Type | Applies to | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | Both | For regular tasks this **is the `journeyId`** the task links to. For nested-journey tasks it's just the task id. |
| `label` | `string` | Both | Visible task name. |
| `status` | `TaskStatus` | Both | The *initial* status: `not-started`, `in-progress`, `completed`, `cannot-start`. Runtime status is computed — see below. |
| `statusLabel` | `string` | Both | Overrides the displayed status **text** only (the computed status still drives the tag colour). Useful for "Cannot start yet" / "Not ready to send" phrasing. |
| `dependsOn` | `string[]` | Both | Task `id`s that must be `completed` before this task unlocks. While unmet, it renders as `cannot-start` (no link). |
| `type` | `'task'` (default) \| `'nested-journey'` | — | Discriminator. |
| `journeyRef` | `string` | `nested-journey` only | The journey this task recurses into. Required when `type` is `"nested-journey"`. |

### How runtime status is computed

The schema's `status` is only the starting point. On every render the framework overlays live state:

1. If any `dependsOn` task is not `completed` → the task shows `cannot-start` and renders **without a link**.
2. Otherwise the journey's status from `parent.json` wins (`in-progress` once any answer is saved, `completed` once its summary/hub is confirmed).
3. All linked statuses point at the journey root (`/journeys/{id}`), which resolves to the journey's first form, hub, or sub-task-list.

## Footer actions (`TaskListFooterAction`)

Bottom-of-page buttons, rendered as form submits so the engine can run real logic. The same shape is reused by [summary pages](./summary-schema.md) and [sub-task-list pages](./form-schema.md#sub-task-list-pages-tasklistjourneypage).

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | Yes | Button text. |
| `actionId` | `string` | Yes | Which handler runs. Built-ins: `save-and-exit`, `delete-application`. Additional handlers can be registered by the consumer. |
| `variant` | `'primary' \| 'secondary' \| 'warning' \| 'inverse'` | No | Button style (default `primary`). |
| `redirectTo` | `string` | No | Where the user lands after the action — a plain URL/path (default `/`, the consumer's dashboard root). |
