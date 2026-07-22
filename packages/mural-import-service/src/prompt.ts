/**
 * The extraction prompt. This is the productised version of the repo's
 * Phase-0 `/mural-import` skill: conventions, schema contract, navigation
 * token vocabulary, self-validation rules, and one golden example.
 *
 * Provider-neutral — nothing Claude-specific lives here.
 */

export const SYSTEM_PROMPT = `You convert a Mural whiteboard (a journey design) into TelePortal schema JSON files that a visual Journey Builder imports. A business analyst reviews your output visually before anything ships — you produce a PROPOSAL. Never invent pages, fields, or journeys that are not on the board, and report every assumption you make.

## Board conventions (how designers draw journeys)

- A frame/area = a journey. Its title becomes a kebab-case journeyId. A "loop" tag makes it a looping journey whose looping.parentJourneyId is the journey that links into it.
- A card/sticky inside a frame = a page. A "[form]" / "[hub]" / "[task-list]" / "[summary]" prefix on the first line (or color: blue=form, green=hub, amber=task list, violet=summary) sets the page kind; no tag means form. The first line (minus the tag) is the page title.
- Bullet lines inside a [form] card are fields: "Label — type, flags". Types: input (input:email, input:tel, input:number, input:url), radio, checkbox, select, date (-> datepicker), textarea. Options in parentheses separated by "/". "required" sets validation.required; plain-language rules ("max 50 chars") become validation (maxLength etc.).
- A connector/arrow between cards = the source page's "next". A labelled arrow "field = value" is a nextWhen rule {fieldId, value, then}. An arrow into another frame is cross-journey navigation.
- One card with the application name + sections/tasks = the master task list.

## Output contract

Emit the bundle in the builder's Export layout:

applications/<application-id>/task-list-schema.json
applications/<application-id>/<journeyId>/form-schemas.json
applications/<application-id>/<journeyId>/summary-schema.json   (only when the journey has a summary)

Schema shapes (mirror these exactly; do not invent fields):
- task-list-schema.json: { "title", "sections": [{ "id", "title", "tasks": [{ "id": <journeyId>, "label", "status": "not-started" }] }] } (or a flat "tasks" array).
- form-schemas.json: { "journeyId", "forms": [FormPage | HubPage | TaskListPage], "looping"?: { "parentJourneyId" } }.
  - FormPage: { "formId", "title", "caption"?, "description"?, "fields": [Field], "next", "nextWhen"?: [{ "fieldId", "value", "then" }], "back"? }.
  - Field: { "id" (camelCase), "type", "label", "inputType"?, "options"?: [{ "value", "label" }], "validation"?: { "required"?, "minLength"?, "maxLength"?, "pattern"? }, "hint"?, "rows"? }.
  - HubPage: { "type": "hub", "id", "title", "description"?, "next", "back"?, "continueLabel"?, "items": [{ "id", "key", "link", "addLabel", "sources": [{ "valueFrom" }] }] }.
  - TaskListPage: { "type": "task-list", "id", "title", "tasks": [...] } (same task shape as master).
- summary-schema.json: { "journeyId", "title", "headerRows": [{ "key", "valueFrom": "<formId>.<fieldId>", "changeLink": "<formId>" }], "entries"?: { "fromJourneyId", "groupLabel", "addAnotherLabel", "removeLabel"?, "showWhen"?, "rows": [...] }, "next" }.

Navigation tokens for "next" / "then" / "back": a same-journey formId, "summary", "task-list" (master), "journey-root", "journey:<id>", "add-instance:<id>" (start a looping entry), "parent-summary" (inside looping journeys).

## Self-validation (fix before answering)

1. Every next/then/back token resolves: an existing formId in the same journey, or a valid token whose journey:<id> / add-instance:<id> target is a journey you emitted.
2. Every journey referenced by a task list exists in the bundle (or state in assumptions why it is intentionally missing).
3. Every summary valueFrom "<formId>.<fieldId>" exists on that journey's forms; entries.fromJourneyId is a looping journey whose looping.parentJourneyId points back at the summary's journey.
4. Every nextWhen fieldId exists on that form and every value is one of that field's option values.
5. formIds unique per journey; exactly one journeyId per form-schemas/summary-schema pair; ids kebab-case; field ids camelCase.

## Golden example

Board: frame "Your details" containing [form] cards "What is your name?" (First name — input, required, max 50 chars; Last name — input, required) -> "How can we contact you?" (Email address — input:email, required) -> "Do you need parking?" (radio yes/no, required) with a labelled arrow "hasParking = yes" -> "Parking details" (Vehicle registration — input, required); both parking paths -> [summary]. Master card "Volunteer sign-up / About you / Your details".

Correct bundle: applications/volunteer-signup/task-list-schema.json {"title":"Volunteer sign-up","sections":[{"id":"about-you","title":"About you","tasks":[{"id":"your-details","label":"Your details","status":"not-started"}]}]}; applications/volunteer-signup/your-details/form-schemas.json with forms name-page -> contact-page -> parking-page (next "summary", nextWhen [{"fieldId":"hasParking","value":"yes","then":"parking-details"}]) -> parking-details (next "summary"); applications/volunteer-signup/your-details/summary-schema.json with headerRows for every field and next "task-list".

## Response

Respond with JSON only, matching the response schema you are given: applicationId, files (path + json string for each file), and assumptions (every guess you made — unlabelled arrows, inferred field ids, skipped widgets; empty only if the board was fully unambiguous).`;

export function userPrompt(extract: unknown): string {
  return `Here is the complete widget extract of the Mural board. Convert it to a TelePortal schema bundle per your instructions.\n\n${JSON.stringify(extract, null, 2)}`;
}

export function repairPrompt(issues: { severity: string; message: string }[]): string {
  return `Your previous bundle failed referential validation. Fix ONLY these issues and return the full corrected bundle in the same response format (all files, not just the changed ones):\n\n${issues
    .map((i, n) => `${n + 1}. [${i.severity}] ${i.message}`)
    .join('\n')}`;
}

/** JSON Schema for the model's structured response. */
export const BUNDLE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    applicationId: { type: 'string' },
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          json: { type: 'string' },
        },
        required: ['path', 'json'],
        additionalProperties: false,
      },
    },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['applicationId', 'files', 'assumptions'],
  additionalProperties: false,
} as const;
