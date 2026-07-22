---
sidebar_position: 2
title: Form Schema
---

# `form-schemas.json` — Form Schema

The heart of a journey. One file per journey at:

```
applications/{applicationId}/schemas/journeys/{journeyId}/form-schemas.json
```

It holds **every page** in the journey — question (form) pages, an optional hub page, or an optional sub-task-list page — plus branching rules and looping configuration.

## Top level (`FormSchema`)

```json
{
  "journeyId": "occupier-of-the-land",
  "forms": [ /* JourneyPage[] */ ],
  "looping": { "parentJourneyId": "occupier-of-the-land" },
  "schemaVersion": "1"
}
```

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `journeyId` | `string` | Yes | Stable journey identifier. Must match the folder segment in the blob path and the `[journeyId]` URL segment. |
| `forms` | `JourneyPage[]` | Yes | Pages in authoring order. The first *form* page is where the journey-root redirect lands (unless a hub or task-list page exists — those render at the journey root instead). |
| `looping` | `LoopingConfig` | No | Marks this journey as a **looping (repeatable-entry)** journey — see [Looping journeys](#looping-journeys). |
| `schemaVersion` | `string` | No | Reserved for future migration logic. |

## Page variants (`JourneyPage`)

Each element of `forms` is one of three page types, discriminated by `type`:

| `type` | Page | Rendered at | Purpose |
| --- | --- | --- | --- |
| `"form"` (or omitted) | [`FormPage`](#form-pages-formpage) | `/journeys/{journeyId}/{formId}` | A question page with fields and a submit button |
| `"hub"` | [`HubPage`](#hub-pages-hubpage) | `/journeys/{journeyId}` (journey root) | A "manage" page listing add/change rows |
| `"task-list"` | [`TaskListJourneyPage`](#sub-task-list-pages-tasklistjourneypage) | `/journeys/{journeyId}` (journey root) | A sub-task-list that links to other journeys |

Summary pages are **not** a `JourneyPage` variant — they live in their own [`summary-schema.json`](./summary-schema.md) and render at the fixed `/journeys/{journeyId}/summary` route.

---

## Form pages (`FormPage`)

```json
{
  "formId": "are-you-occupier",
  "title": "Are you the occupier of the land?",
  "caption": "Occupier of the land",
  "description": "An occupier is defined by their control over the land…",
  "fields": [ /* FormField[] */ ],
  "back": "journey:activities",
  "next": "summary",
  "nextWhen": [
    { "fieldId": "isOccupier", "value": "no", "then": "add-instance:occupier-details" }
  ],
  "submitLabel": "Continue"
}
```

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"form"` | No | Discriminator; defaults to `"form"` when omitted. |
| `formId` | `string` | Yes | Stable page id. Appears in the URL (`/journeys/{journeyId}/{formId}`), in `next`/`back` tokens, in `valueFrom` paths, and as the key under which the page's answers are stored. |
| `title` | `string` | Yes | The page's `<h1>`. |
| `caption` | `string` | No | Smaller heading rendered above the title (e.g. the activity name), GOV.UK caption style. |
| `description` | `string` | No | Descriptive text between the title and the fields. Plain string (no markdown). Useful for context like "is this still correct?" pages. |
| `fields` | `FormField[]` | Yes | Fields rendered top to bottom — see [Field types](#field-types-formfield). |
| `next` | `string` | Yes | Default destination after a successful submit. A [navigation token](./navigation-tokens.md): another `formId`, or `summary`, `confirmation`, `task-list`, `journey-root`, `parent-summary`, `journey:{jid}`, `add-instance:{jid}`. |
| `nextWhen` | `NextWhenRule[]` | No | Branching rules — see [Branching](#branching-nextwhen). |
| `back` | `string` | No | Back-link target, same token syntax as `next`. When omitted, no back link renders. |
| `submitLabel` | `string` | No | Overrides the default **"Save and continue"** button label. |
| `redirectIfMissing` | `RedirectIfMissing` | No | Pre-render guard — see [Pre-render guards](#pre-render-guards-redirectifmissing). |
| `secondaryLinks` | `SecondaryLink[]` | No | Links rendered below the submit button — see [Secondary links](#secondary-links). |

### Branching (`nextWhen`)

`nextWhen` overrides the page's default `next` based on the submitted answers. Rules are evaluated **in order; first match wins**; if nothing matches, the default `next` applies.

```json
"nextWhen": [
  { "fieldId": "isOccupier", "value": "no",  "then": "add-instance:occupier-details" },
  { "fieldId": "isOccupier", "value": "yes", "then": "summary" }
]
```

| Property | Type | Meaning |
| --- | --- | --- |
| `fieldId` | `string` | The field on **this page** whose submitted value is tested. |
| `value` | `string` | The value to match (for checkboxes: matches if the array contains the value). |
| `then` | `string` | The destination when matched — same token syntax as `next`. |

**Abandoned-branch clearing:** when a user goes back (e.g. via a summary "Change" link) and picks a *different* branch, the framework automatically clears the answers collected down the now-abandoned branch — including resetting looping child journeys targeted by `add-instance:`/`journey:` tokens. Pages reachable from both branches (reconvergence) are preserved. This happens in `data.utils` at save time, so every consumer and the Journey Builder preview all get it for free.

### Pre-render guards (`redirectIfMissing`)

Bounces the user away *before* rendering when prerequisite data is missing:

```json
"redirectIfMissing": {
  "valueFrom": "postcode-page.postcode",
  "to": "postcode-page"
}
```

| Property | Type | Meaning |
| --- | --- | --- |
| `valueFrom` | `string` | Path into parent state ([syntax](./overview.md#the-valuefrom-path-syntax)). If it resolves empty/null/undefined, the redirect fires. |
| `to` | `string` | Where to send the user — same token syntax as `next`. |

Typical use: an address-select page that requires a postcode from a previous page.

### Secondary links

Static links below the submit button:

```json
"secondaryLinks": [
  { "text": "Enter address manually", "href": "manual-address-page" }
]
```

| Property | Type | Meaning |
| --- | --- | --- |
| `text` | `string` | Link text. |
| `href` | `string` | Navigation-token target — same syntax as `next`/`back`. |

---

## Field types (`FormField`)

Every field shares these base properties:

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Field identifier — the key under which the answer is stored (`answers[formId][id]`) and the second half of `valueFrom` paths. |
| `type` | `FieldType` | Yes | Selects the wrapper component: `input`, `select`, `radio`, `checkbox`, `datepicker`, `textarea`. |
| `label` | `string` | Yes | Visible label / legend. Also embedded in default validation messages. |
| `hint` | `string` | No | Grey hint text below the label. |
| `validation` | `ValidationRule` | No | See [Validation rules](#validation-rules-validationrule). |

### `input`

Single-line text input.

```json
{
  "id": "email",
  "type": "input",
  "inputType": "email",
  "autocomplete": "email",
  "label": "Email address",
  "validation": { "required": true }
}
```

| Property | Type | Meaning |
| --- | --- | --- |
| `inputType` | `'text' \| 'email' \| 'number' \| 'tel' \| 'url' \| 'password'` | HTML input type; default `text`. With `number`, the value is coerced to a JS number on submit. |
| `autocomplete` | `string` | HTML autocomplete token (e.g. `given-name`, `postal-code`) — important for GDS accessibility compliance. |

### `select`

Dropdown. Options are **either static or dynamic** — set `options` *or* `dataSource`, never both.

```json
{
  "id": "address",
  "type": "select",
  "label": "Select your address",
  "placeholder": "Choose an address…",
  "dataSource": {
    "providerId": "address-lookup",
    "paramFrom": "postcode-page.postcode"
  }
}
```

| Property | Type | Meaning |
| --- | --- | --- |
| `options` | `FieldOption[]` | Static options. |
| `dataSource` | `SelectDataSource` | Server-side dynamic options. `providerId` names a provider registered via `registerOptionsProvider()`; `paramFrom` is a parent-state path whose resolved value is passed to the provider (e.g. a postcode driving an address lookup). |
| `placeholder` | `string` | Disabled first option shown before a choice is made. |

### `radio`

Single choice from a list.

```json
{
  "id": "isOccupier",
  "type": "radio",
  "label": "Are you the occupier of the land?",
  "options": [
    { "value": "yes", "label": "Yes" },
    { "value": "no", "label": "No" }
  ]
}
```

| Property | Type | Meaning |
| --- | --- | --- |
| `options` | `FieldOption[]` | Required. See [Options](#options-fieldoption). |

### `checkbox`

Multi-select; the stored answer is an **array of the checked `value` strings**.

```json
{
  "id": "activities",
  "type": "checkbox",
  "label": "Which activities apply?",
  "options": [
    { "value": "digging", "label": "Digging" },
    { "value": "storage", "label": "Storage of materials" }
  ],
  "validation": { "required": true, "min": 1, "max": 3 }
}
```

For checkboxes, `validation.min`/`max` constrain the **number of selections**.

### `datepicker`

Renders the GOV.UK three-input day / month / year pattern. The three inputs are recombined into a single ISO `YYYY-MM-DD` string before validation and storage.

```json
{ "id": "startDate", "type": "datepicker", "label": "Start date", "validation": { "required": true } }
```

No extra properties beyond the base set.

### `textarea`

Multi-line text.

```json
{ "id": "details", "type": "textarea", "label": "Give us the details", "rows": 5 }
```

| Property | Type | Meaning |
| --- | --- | --- |
| `rows` | `number` | Visible rows (default 5). |

### Options (`FieldOption`)

Used by `select`, `radio`, and `checkbox`:

| Property | Type | Meaning |
| --- | --- | --- |
| `value` | `string` | The stored value. This is what `nextWhen.value`, `HubItemSource.equals`, and `showWhen.equals` compare against. |
| `label` | `string` | The visible text. |
| `hint` | `string` | Per-option hint (radio/checkbox). |
| `conditional` | `FormField[]` | GOV.UK **conditionally revealed** fields — shown only while this option is selected/checked, and submitted with the same form. Conditional fields should generally not be `required` at the schema level. |

Example — reveal an email input only when "Email" is chosen:

```json
{
  "id": "contactPreference",
  "type": "radio",
  "label": "How should we contact you?",
  "options": [
    {
      "value": "email",
      "label": "Email",
      "conditional": [
        { "id": "contactEmail", "type": "input", "inputType": "email", "label": "Email address" }
      ]
    },
    { "value": "post", "label": "Post" }
  ]
}
```

---

## Validation rules (`ValidationRule`)

The framework builds a **Yup** schema from this block at request time — validation always runs server-side.

```json
"validation": {
  "required": true,
  "minLength": 2,
  "maxLength": 30,
  "pattern": "^[A-Z]{1,2}\\d{1,2} ?\\d[A-Z]{2}$",
  "min": 18,
  "max": 120,
  "messages": {
    "required": "Enter your first name",
    "pattern": "Enter a real postcode"
  }
}
```

| Property | Type | Applies to | Meaning |
| --- | --- | --- | --- |
| `required` | `boolean` | All types | Rejects empty values (for checkboxes: at least one selection). |
| `minLength` | `number` | Strings | Minimum character length. |
| `maxLength` | `number` | Strings | Maximum character length. |
| `pattern` | `string` | Strings | Regex **source string** (escape backslashes for JSON), compiled at runtime. |
| `min` | `number` | Numbers / checkbox arrays | Minimum numeric value, or minimum selection count. |
| `max` | `number` | Numbers / checkbox arrays | Maximum numeric value, or maximum selection count. |
| `messages` | `ValidationMessages` | — | Per-rule custom error text; keys mirror the rule names (`required`, `minLength`, `maxLength`, `pattern`, `min`, `max`). |

When no custom message is given, defaults embed the field's `label` (e.g. *"First name is required"*). Errors render in the GOV.UK `ErrorSummary` at the top of the page **and** inline against the field, with the just-typed values preserved via the [draft round-trip](./state-persistence.md#draft-round-trips-transient).

---

## Hub pages (`HubPage`)

A hub is a declarative **"manage" page** rendered at the journey root — a list of rows that each show either an "Add" link (nothing entered yet) or the current value plus a "Change" link. The classic use is a contacts journey: application contact, billing contact, site contact, each added/changed independently, then one Continue.

```json
{
  "type": "hub",
  "id": "contacts-hub",
  "title": "Contact details",
  "description": "Add the contacts for this application.",
  "back": "task-list",
  "next": "task-list",
  "continueLabel": "Continue",
  "items": [
    {
      "id": "app-contact",
      "key": "Application contact",
      "link": "app-contact-name",
      "addLabel": "Add application contact",
      "changeLabel": "Change",
      "sources": [
        { "valueFrom": "app-contact-name.fullName",
          "displayPaths": ["app-contact-name.fullName", "app-contact-email.email", "app-contact-phone.phone"] }
      ]
    },
    {
      "id": "billing-contact",
      "key": "Billing contact",
      "showWhen": "app-contact-name.fullName",
      "link": "billing-same-as",
      "addLabel": "Add billing contact",
      "sources": [
        { "valueFrom": "billing-same-as.same", "equals": "yes", "literal": "Same as application contact" },
        { "valueFrom": "billing-name.fullName", "displayPaths": ["billing-name.fullName", "billing-email.email"] }
      ]
    }
  ]
}
```

### `HubPage` properties

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"hub"` | Yes | Discriminator. |
| `id` | `string` | Yes | Stable id for React keys. **Not** URL-addressable — the hub renders at the journey root. |
| `title` | `string` | Yes | Page `<h1>`. |
| `description` | `string` | No | Text under the title. |
| `back` | `string` | No | Back-link token (same syntax as `FormPage.back`). |
| `next` | `string` | Yes | Where **Continue** goes (typically `"task-list"`). Submitting also marks the journey **completed**. |
| `continueLabel` | `string` | No | Continue button label (default "Continue"). |
| `items` | `HubItem[]` | Yes | The rows. |

### `HubItem` properties

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Stable row id (keys/aria). |
| `key` | `string` | Yes | Row label, e.g. "Application contact". |
| `showWhen` | `string` | No | Gate: the row renders only when this parent-state path resolves non-empty. Use to reveal dependent rows progressively. |
| `link` | `string` | Yes | Where Add/Change navigates — navigation-token syntax (usually a `formId`). |
| `addLabel` | `string` | Yes | The link text when **no source matches** (nothing entered yet). |
| `changeLabel` | `string` | No | The link text when a source matches (default "Change"). |
| `sources` | `HubItemSource[]` | Yes | Ordered value resolvers — **first match wins**. |

### `HubItemSource` properties

A source *matches* when its `valueFrom` resolves to a non-empty string (and, if `equals` is set, the value equals it).

| Property | Type | Meaning |
| --- | --- | --- |
| `valueFrom` | `string` | Parent-state path to test. |
| `equals` | `string` | Optional exact-match condition on the resolved value. |
| `literal` | `string` | Static display text when this source matches (wins over `displayPaths`). E.g. "Same as application contact". |
| `displayPaths` | `string[]` | Multiple paths whose non-empty resolutions are joined by newlines — e.g. name + email + phone on one row. When neither `literal` nor `displayPaths` is set, the resolved `valueFrom` value itself is displayed. |

---

## Sub-task-list pages (`TaskListJourneyPage`)

A task-list **inside a journey**, rendered at the journey root. Same shape as the [application task list](./task-list-schema.md) (sections/tasks/footer actions) with page furniture added. Use it when one task on the master list ("Activities") fans out into several sub-journeys.

```json
{
  "type": "task-list",
  "id": "activities-tasks",
  "title": "Activities",
  "caption": "Apply for a permit",
  "description": "Complete each activity section.",
  "back": "task-list",
  "sections": [
    {
      "id": "land",
      "title": "About the land",
      "tasks": [
        { "id": "occupier-of-the-land", "label": "Occupier of the land", "status": "not-started" }
      ]
    }
  ],
  "footerActions": [
    { "label": "Continue", "actionId": "save-and-exit", "redirectTo": "/applications/demo" }
  ]
}
```

| Property | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"task-list"` | Yes | Discriminator. |
| `id` | `string` | Yes | Stable id (not URL-addressable). |
| `title` | `string` | Yes | Page `<h1>`. |
| `caption` | `string` | No | Smaller heading above the title. |
| `description` | `string` | No | Text under the title. |
| `back` | `string` | No | Back-link token. |
| `tasks` / `sections` / `footerActions` | — | — | Identical semantics to the [Task List Schema](./task-list-schema.md); `sections` takes precedence over `tasks`. Tasks link to journeys by `id` (or `journeyRef` for `nested-journey` tasks). |

---

## Looping journeys

Setting `looping` on a `FormSchema` turns the journey into a **repeatable-entry** journey — "Add another occupier", "Add another director", etc.

```json
{
  "journeyId": "occupier-details",
  "looping": { "parentJourneyId": "occupier-of-the-land" },
  "forms": [
    { "formId": "details-page", "title": "Occupier details", "fields": [ /* … */ ], "next": "consent-page" },
    { "formId": "consent-page", "title": "Do you have the occupier's consent?", "fields": [ /* … */ ], "next": "parent-summary" }
  ]
}
```

| Property | Type | Meaning |
| --- | --- | --- |
| `parentJourneyId` | `string` | The journey whose [summary page](./summary-schema.md#entries--repeatable-entry-block) lists these entries. After a looping journey's last form, the engine redirects to `/journeys/{parentJourneyId}/summary`. |

How it works at runtime:

- Instead of one flat `answers` bag, the journey's state stores `entries: JourneyEntry[]` — each entry has an engine-minted `_id` and its own per-form answers.
- The journey is entered via the **`add-instance:{journeyId}`** token (from a parent form's `nextWhen`, or the summary's "Add another" link). Each use mints a fresh entry and threads `?instance={id}` through the form URLs.
- The last form's `next` is the **`parent-summary`** token, which lands on the parent journey's summary where all entries are listed with Change / Remove actions.
- Removal goes through the engine's built-in remove-confirmation page (`/journeys/{journeyId}/_remove?instance=…`).

See the worked example across this page, [Summary Schema](./summary-schema.md), and the `occupier-of-the-land` demo journey in `examples/next-app`.
