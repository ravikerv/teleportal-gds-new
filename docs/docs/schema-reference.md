---
sidebar_position: 3
title: Schema Reference
---

# Schema Reference

Every journey is described by up to four JSON files in blob storage. Developers only ever edit these files — the library handles rendering, validation, navigation, and persistence.

This page documents the exact shape of each schema type. The TypeScript types behind them (`FormSchema`, `SummarySchema`, `TaskListSchema`, `ConfirmationSchema`) are exported from the package.

---

## `form-schemas.json`

Holds every form page in a journey. One file per journey at:

```
applications/{applicationId}/schemas/journeys/{journeyId}/form-schemas.json
```

### Top level

```json
{
  "journeyId": "personal-details",
  "schemaVersion": "1",
  "forms": [ /* FormPage[] */ ]
}
```

| Field           | Type             | Required | Notes |
| --------------- | ---------------- | -------- | ----- |
| `journeyId`     | string           | Yes      | Must match the URL/folder segment. |
| `schemaVersion` | string           | No       | Reserved for future migration logic. |
| `forms`         | `FormPage[]`     | Yes      | Page order is preserved. |

### `FormPage`

```json
{
  "formId": "name-page",
  "title": "What is your name?",
  "fields": [ /* FormField[] */ ],
  "next": "dob-page"
}
```

| Field    | Type           | Notes |
| -------- | -------------- | ----- |
| `formId` | string         | Stable identifier; appears in URLs (`/applications/{id}/journeys/{jid}/{formId}`). |
| `title`  | string         | Rendered as `<h1 className="govuk-heading-l">`. |
| `fields` | `FormField[]`  | Rendered top to bottom. |
| `next`   | string         | The next `formId`, or the special tokens `"summary"` / `"confirmation"`. |

### Field types

Every field has these common keys:

```json
{
  "id": "firstName",
  "type": "input",
  "label": "First name",
  "hint": "As shown on your passport.",
  "validation": { /* ValidationRule */ }
}
```

The `type` field selects which wrapper component renders the field. Six types are supported:

#### `input`

```json
{
  "id": "firstName",
  "type": "input",
  "label": "First name",
  "inputType": "text",
  "autocomplete": "given-name",
  "validation": { "required": true, "minLength": 1 }
}
```

`inputType` accepts `text` (default), `email`, `number`, `tel`, `url`, `password`. When `inputType` is `number`, the value is coerced to a JS `number` on submit.

#### `select`

```json
{
  "id": "country",
  "type": "select",
  "label": "Country",
  "placeholder": "Choose…",
  "options": [
    { "value": "uk", "label": "United Kingdom" },
    { "value": "ie", "label": "Ireland" }
  ]
}
```

#### `radio`

```json
{
  "id": "contactPreference",
  "type": "radio",
  "label": "How should we contact you?",
  "options": [
    { "value": "email", "label": "Email", "hint": "Same-day response." },
    { "value": "post", "label": "Post" }
  ]
}
```

#### `checkbox`

Multi-select. Stored as an array of `value` strings.

```json
{
  "id": "interests",
  "type": "checkbox",
  "label": "What are you interested in?",
  "options": [
    { "value": "sports", "label": "Sports" },
    { "value": "music", "label": "Music" }
  ],
  "validation": { "required": true }
}
```

#### `datepicker`

Renders the GovUK three-input day/month/year pattern. Values are recombined into a single ISO `YYYY-MM-DD` string before validation.

```json
{
  "id": "dob",
  "type": "datepicker",
  "label": "Date of birth",
  "validation": { "required": true }
}
```

#### `textarea`

```json
{
  "id": "additionalInfo",
  "type": "textarea",
  "label": "Anything else we should know?",
  "rows": 5
}
```

### Validation rules

```json
{
  "required": true,
  "minLength": 2,
  "maxLength": 30,
  "pattern": "^[A-Z]{1,2}\\d{1,2} ?\\d[A-Z]{2}$",
  "min": 18,
  "max": 120,
  "messages": {
    "required": "Tell us your first name",
    "pattern": "Enter a real postcode"
  }
}
```

| Key         | Applies to                  | Notes |
| ----------- | --------------------------- | ----- |
| `required`  | All field types             | Empty value rejected. |
| `minLength` | Strings                     | Length in characters. |
| `maxLength` | Strings                     | Length in characters. |
| `pattern`   | Strings                     | Regex source string. |
| `min`       | Numbers, multi-checkbox arrays | For numbers: minimum value; for arrays: minimum count. |
| `max`       | Numbers, multi-checkbox arrays | For numbers: maximum value; for arrays: maximum count. |
| `messages`  | Per-rule overrides          | Each key matches a rule above; a custom string replaces the default. |

Default messages embed the field's `label` (e.g. *"First name is required"*).

---

## `summary-schema.json`

The "Check your answers" page for a journey. Located at:

```
applications/{applicationId}/schemas/journeys/{journeyId}/summary-schema.json
```

```json
{
  "journeyId": "personal-details",
  "title": "Check your answers",
  "rows": [
    {
      "key": "First name",
      "valueFrom": "name-page.firstName",
      "changeLink": "name-page"
    },
    {
      "key": "Date of birth",
      "valueFrom": "dob-page.dob",
      "changeLink": "dob-page"
    }
  ],
  "next": "confirmation"
}
```

| Field                 | Notes |
| --------------------- | ----- |
| `rows[i].key`         | Visible row label. |
| `rows[i].valueFrom`   | Path into parent state. Two forms: `formId.fieldId` (resolves against the current journey's saved answers) or `system.<key>` (resolves against `parent.system`). Cross-journey paths aren't supported yet. |
| `rows[i].changeLink`  | The `formId` the "Change" link should jump back to. |
| `next`                | The form-page-style `next` token: typically `"confirmation"`. |

The page renders a `<SummaryList>` plus a "Confirm and continue" submit button which marks the journey completed and redirects to `next`.

---

## `task-list-schema.json`

The application-level list of journeys. One file per application at:

```
applications/{applicationId}/schemas/task-list-schema.json
```

```json
{
  "title": "Apply for a permit",
  "tasks": [
    {
      "id": "personal-details",
      "label": "Your details",
      "status": "not-started"
    },
    {
      "id": "address",
      "label": "Your address",
      "status": "not-started",
      "dependsOn": ["personal-details"]
    },
    {
      "id": "household",
      "label": "Household members",
      "type": "nested-journey",
      "journeyRef": "household-member-journey",
      "status": "not-started"
    }
  ]
}
```

| Field           | Notes |
| --------------- | ----- |
| `title`         | Rendered as `<h1>`. |
| `tasks[i].id`   | Journey id (or task id for nested journeys). |
| `tasks[i].label`| Visible task name. |
| `tasks[i].status` | One of `not-started`, `in-progress`, `completed`, `cannot-start`. The schema's value is the *initial* status; runtime status is computed from parent state and `dependsOn`. |
| `tasks[i].dependsOn` | Array of task `id`s that must be `completed` before this task is unlocked. While unmet, this task renders as `cannot-start`. |
| `tasks[i].type` | `"task"` (default, may be omitted) or `"nested-journey"`. |
| `tasks[i].journeyRef` | Required when `type === "nested-journey"`. References another journey id. |

A task with status `cannot-start` renders without a link. All other statuses link to the journey root, which the consumer redirects to the journey's first form (see [Usage › Journey root](./usage.md#journey-root-redirect-to-first-form)).

---

## `confirmation-schema.json`

The post-submit panel. Located at:

```
applications/{applicationId}/schemas/journeys/{journeyId}/confirmation-schema.json
```

```json
{
  "journeyId": "personal-details",
  "panelTitle": "Application complete",
  "referenceLabel": "Your reference number",
  "referenceFrom": "system.referenceId",
  "nextStepsMarkdown": "We'll email you within 5 working days.\n\nIf you do not hear from us, contact support."
}
```

| Field               | Notes |
| ------------------- | ----- |
| `panelTitle`        | The bold title in the green confirmation panel. |
| `referenceLabel`    | The label shown above the reference number, inside the panel. |
| `referenceFrom`     | Path into parent state. Same syntax as `summary.rows[i].valueFrom`. Typically `"system.referenceId"`. |
| `nextStepsMarkdown` | Body content rendered below the panel. Currently split on blank lines into `<p>` paragraphs — full markdown (lists, links) is a future addition. |

The library auto-issues a placeholder `system.referenceId` (`REF-{appSlug}-{base36 timestamp}`) when a journey is marked completed and no reference id is set. Real integrations should overwrite `parent.system.referenceId` from a backend system before completion.

---

## Persisted state shapes

These aren't authored by hand — the library writes them — but they're useful to understand for debugging.

### `parent.json`

```json
{
  "applicationId": "abc-123",
  "journeys": {
    "personal-details": {
      "applicationId": "abc-123",
      "journeyId": "personal-details",
      "status": "in-progress",
      "answers": {
        "name-page": { "firstName": "Ada", "lastName": "Lovelace" }
      },
      "updatedAt": "2026-05-06T12:00:00Z"
    }
  },
  "system": {
    "referenceId": "REF-ABC123-1L8X2KC"
  },
  "updatedAt": "2026-05-06T12:00:00Z"
}
```

### `data/journeys/{journeyId}.json`

A denormalised slice of the parent — same shape as `parent.journeys[journeyId]`. Reads pull from this file; writes go to both `parent.json` (canonical, with optimistic concurrency via `If-Match`) and the per-journey file.

### `data/journeys/{journeyId}/_drafts/{formId}.json` (transient)

When a form submission fails validation, the just-submitted values + errors are written here. The next render of the same form page consumes (reads + deletes) this blob and uses its values + errors. On a successful save, any stale draft is cleared.
