/**
 * JSON schema shapes — the contract between developers (who edit JSON)
 * and the engine (which renders that JSON). All four schema types in
 * ARCHITECTURE.md §5 are modelled here.
 */

export type SchemaType = 'form' | 'summary' | 'task-list' | 'confirmation' | 'hub';

// ---------------------------------------------------------------------------
// Validation rules (consumed by validation.utils to build a Yup schema)
// ---------------------------------------------------------------------------

export type ValidationMessages = {
  required?: string;
  minLength?: string;
  maxLength?: string;
  pattern?: string;
  min?: string;
  max?: string;
};

export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  /** Regex source as a string — compiled at runtime. */
  pattern?: string;
  min?: number;
  max?: number;
  messages?: ValidationMessages;
};

// ---------------------------------------------------------------------------
// Form fields — discriminated by `type`
// ---------------------------------------------------------------------------

export type FieldOption = {
  value: string;
  label: string;
  hint?: string;
  /**
   * GovUK "conditionally revealed" content. When this option is selected
   * (radio) or checked (checkbox), the listed fields are shown and become
   * part of the same form submission. Conditional fields should typically
   * not be `required` at the schema level (they only make sense when the
   * parent option is selected).
   */
  conditional?: FormField[];
};

export type FieldType = 'input' | 'select' | 'radio' | 'checkbox' | 'datepicker' | 'textarea';

type BaseField = {
  id: string;
  label: string;
  hint?: string;
  validation?: ValidationRule;
};

export type InputField = BaseField & {
  type: 'input';
  inputType?: 'text' | 'email' | 'number' | 'tel' | 'url' | 'password';
  autocomplete?: string;
};

/**
 * Server-side options provider lookup. The engine resolves `paramFrom` from
 * parent state and passes it to the provider registered under `providerId`
 * (see `registerOptionsProvider`). Use this when a select's options depend
 * on prior answers (e.g. address lookup keyed by postcode).
 */
export type SelectDataSource = {
  /** Key for a provider registered via registerOptionsProvider. */
  providerId: string;
  /** Path into parent state (same syntax as SummaryRow.valueFrom). */
  paramFrom: string;
};

export type SelectField = BaseField & {
  type: 'select';
  /** Static options. Either `options` or `dataSource` must be set (not both). */
  options?: FieldOption[];
  /** Dynamic options resolved server-side via a registered provider. */
  dataSource?: SelectDataSource;
  placeholder?: string;
};

export type RadioField = BaseField & {
  type: 'radio';
  options: FieldOption[];
};

export type CheckboxField = BaseField & {
  type: 'checkbox';
  options: FieldOption[];
};

export type DatePickerField = BaseField & {
  type: 'datepicker';
};

export type TextAreaField = BaseField & {
  type: 'textarea';
  rows?: number;
};

export type FormField =
  | InputField
  | SelectField
  | RadioField
  | CheckboxField
  | DatePickerField
  | TextAreaField;

// ---------------------------------------------------------------------------
// Top-level schemas
// ---------------------------------------------------------------------------

/**
 * Conditional `next` rule: when `fieldId`'s submitted value equals `value`,
 * the form's effective `next` becomes `then` (overriding the default).
 * Rules are evaluated in order; first match wins. Falls back to the page's
 * default `next` if no rule matches.
 */
export type NextWhenRule = {
  fieldId: string;
  value: string;
  then: string;
};

/**
 * Pre-render guard. The engine resolves `valueFrom` from parent state; if
 * empty/null/undefined, it redirects the user to `to` (same nav-token
 * syntax as `next`). Useful when a form depends on data the user must
 * provide on an earlier page.
 */
export type RedirectIfMissing = {
  valueFrom: string;
  to: string;
};

/** Static link rendered below the submit button (e.g. "Enter manually"). */
export type SecondaryLink = {
  text: string;
  /** Nav-token target — same syntax as `next` / `back`. */
  href: string;
};

export type FormPage = {
  /** Discriminator — defaults to `'form'` when omitted. */
  type?: 'form';
  formId: string;
  title: string;
  /** Smaller heading rendered above the title (e.g. activity name). */
  caption?: string;
  /**
   * Optional descriptive content rendered between the title and fields.
   * Plain string for now (no markdown). Useful for showing pre-filled
   * context like an existing address on a "is this still correct?" page.
   */
  description?: string;
  fields: FormField[];
  /** Next formId, or 'summary' / 'confirmation' / 'journey-root'. Resolved by navigation.utils. */
  next: string;
  /**
   * Branching rules evaluated against submitted answers; first match wins.
   * Rules use the same target syntax as `next`.
   */
  nextWhen?: NextWhenRule[];
  /**
   * Optional back-link target. Same syntax as `next`:
   *   - `<formId>`        — go to that form within this journey
   *   - `'task-list'`     — go to the application's task list
   *   - `'journey-root'`  — go to the journey's hub page
   *   - omitted           — no back link rendered
   */
  back?: string;
  /** Override the default "Save and continue" submit button label. */
  submitLabel?: string;
  /** Pre-render guard that bounces the user when prerequisite data is missing. */
  redirectIfMissing?: RedirectIfMissing;
  /** Links rendered below the submit button. */
  secondaryLinks?: SecondaryLink[];
};

/**
 * Any page belonging to a journey schema. Discriminated by `type`:
 *   - `'form'`      (default when omitted) — a renderable FormPage
 *   - `'hub'`       — a manage-page rendered at the journey root
 *   - `'task-list'` — a sub-task list rendered at the journey root
 *
 * Summary pages live in their own `summary-schema.json` per journey and
 * are not a JourneyPage variant.
 */
export type JourneyPage = FormPage | HubPage | TaskListJourneyPage;

/**
 * Looping configuration for a journey. When set, the journey's runtime
 * state stores a repeatable `entries: JourneyEntry[]` array instead of (or
 * alongside) the flat `answers` block. Each "Add another" cycles the user
 * through the journey's forms with a fresh instance id; submission writes
 * into the addressed entry. After the last form, the engine redirects to
 * the parent journey's summary page (`/journeys/{parentJourneyId}/summary`).
 */
export type LoopingConfig = {
  /** Parent journey that owns the summary listing these entries. */
  parentJourneyId: string;
};

export type FormSchema = {
  journeyId: string;
  /**
   * Pages in authoring order. Hub / task-list / summary pages render at
   * `/journeys/{journeyId}` (the journey root) — they're not URL-addressable
   * by formId. Form pages live at `/journeys/{journeyId}/{formId}`.
   */
  forms: JourneyPage[];
  /** Marks this journey as a looping (repeatable-entry) journey. */
  looping?: LoopingConfig;
  schemaVersion?: string;
};

export type SummaryRow = {
  key: string;
  /** Path into parent state, e.g. "name-page.firstName". */
  valueFrom: string;
  /** formId to deep-link the "Change" action to. */
  changeLink: string;
};

export type TaskStatus = 'not-started' | 'in-progress' | 'completed' | 'cannot-start';

type BaseTask = {
  id: string;
  label: string;
  status: TaskStatus;
  dependsOn?: string[];
  /**
   * Optional override for the displayed status text. The computed status
   * still drives the tag style; this only changes the text. Useful for
   * placeholder tasks like "Cannot start yet" / "Not ready to send".
   */
  statusLabel?: string;
};

/** A regular task entry — the default shape when `type` is omitted. */
export type RegularTask = BaseTask & {
  type?: 'task';
};

/** A task that recurses into another journey. ARCHITECTURE.md §5.5. */
export type NestedJourneyTask = BaseTask & {
  type: 'nested-journey';
  journeyRef: string;
};

export type TaskListItem = RegularTask | NestedJourneyTask;

/**
 * Optional grouping for the task list. When `sections` is provided on
 * `TaskListSchema`, each section renders its own heading + ul; the
 * top-level `tasks` array is ignored.
 */
export type TaskListSection = {
  /** Stable id used for React keys and aria. */
  id: string;
  title: string;
  tasks: TaskListItem[];
};

/**
 * Bottom-of-page action button. Rendered as a form-submit so the engine
 * can hook in real save/delete logic later. The `actionId` identifies a
 * built-in or registered handler; `redirectTo` is where the user lands
 * after the action runs (defaults to `'/'`, i.e. the consumer's
 * dashboard root).
 */
export type TaskListFooterAction = {
  label: string;
  /** Built-in handlers: `'save-and-exit'`, `'delete-application'`. */
  actionId: string;
  /** Button style (default `'primary'`). */
  variant?: 'primary' | 'secondary' | 'warning' | 'inverse';
  /** Post-action target. Plain URL or path (default `'/'`). */
  redirectTo?: string;
};

export type TaskListSchema = {
  title: string;
  /** Flat task list. Used when `sections` is not provided. */
  tasks?: TaskListItem[];
  /** Sectioned task list. When set, takes precedence over `tasks`. */
  sections?: TaskListSection[];
  /** Buttons rendered below the task list (e.g. Save / Delete). */
  footerActions?: TaskListFooterAction[];
  schemaVersion?: string;
};

export type ConfirmationSchema = {
  journeyId: string;
  panelTitle: string;
  referenceLabel: string;
  /** Path into parent state, e.g. "system.referenceId". */
  referenceFrom: string;
  /** Markdown rendered into the "next steps" section. */
  nextStepsMarkdown: string;
  schemaVersion?: string;
};

// ---------------------------------------------------------------------------
// Hub page — declarative manage-page entry that lives alongside FormPages
// inside a FormSchema. Each item resolves its display value from parent
// state via ordered `sources`; first match wins. Rendered at the journey
// root (no formId URL slug).
// ---------------------------------------------------------------------------

export type HubItemSource = {
  /**
   * Path into parent state (same syntax as SummaryRow.valueFrom). The source
   * matches when the resolved value is a non-empty string. The matched row
   * always uses the first matching source from the ordered `sources` list.
   */
  valueFrom: string;
  /** When set, this source matches only if the resolved value === equals. */
  equals?: string;
  /** Static text to render when this source matches. Wins over `displayPaths`. */
  literal?: string;
  /**
   * Multiple value paths whose non-empty resolutions are joined by newlines
   * for display. Use this to show a contact's name + email + phone on one
   * row, for example.
   */
  displayPaths?: string[];
};

export type HubItem = {
  /** Stable id for keying. */
  id: string;
  /** Row label, e.g. "Application contact". */
  key: string;
  /**
   * Optional gate. The row only renders when this path resolves non-empty.
   * Use it to delay revealing dependent rows (e.g. "Billing address" only
   * shows after the billing contact is filled).
   */
  showWhen?: string;
  /** Nav-token target — same syntax as `next` / `back` (e.g. a formId). */
  link: string;
  /** Add-link label shown when no source matches. */
  addLabel: string;
  /** Change-link label shown when a source matches (default "Change"). */
  changeLabel?: string;
  sources: HubItemSource[];
};

/**
 * A "manage" page that lives inside a FormSchema (typed via `type: 'hub'`).
 * Rendered at the journey root, not at a formId path. The Continue button
 * marks the journey complete and navigates `next`.
 */
export type HubPage = {
  type: 'hub';
  /** Stable id (used for React keys). Not URL-addressable. */
  id: string;
  title: string;
  description?: string;
  /** Back-link target. Same nav-token syntax as `FormPage.back`. */
  back?: string;
  /**
   * Where the Continue button takes the user (typically `'task-list'`).
   * The submit also marks the journey as completed.
   */
  next: string;
  /** Continue button label (default "Continue"). */
  continueLabel?: string;
  items: HubItem[];
};

// ---------------------------------------------------------------------------
// Task-list page — a sub-task list rendered at a journey root. Same shape
// as the master task list (sections + tasks), but lives inside a journey's
// form-schemas.json. Tasks point to other journeys via journeyRef.
// ---------------------------------------------------------------------------

export type TaskListJourneyPage = {
  type: 'task-list';
  id: string;
  title: string;
  /** Optional smaller heading rendered above the title (e.g. activity name). */
  caption?: string;
  description?: string;
  back?: string;
  /** Flat task list. Used when `sections` is not provided. */
  tasks?: TaskListItem[];
  /** Sectioned task list. When set, takes precedence over `tasks`. */
  sections?: TaskListSection[];
  /** Buttons rendered below the task list (e.g. Continue / Save as draft). */
  footerActions?: TaskListFooterAction[];
};

// ---------------------------------------------------------------------------
// Summary page — declarative summary for a journey, optionally enumerating
// repeatable entries from a looping child journey (Image 7 in the spec).
// ---------------------------------------------------------------------------

/** Row in the per-entry block of a summary page. */
export type SummaryEntryRow = {
  /** Display label, e.g. "Occupier's name". */
  key: string;
  /**
   * Path within an entry. Same syntax as SummaryRow.valueFrom but rooted in
   * the entry's `answers` (e.g. "details-page.firstName").
   */
  valueFrom: string;
  /** Multiple paths joined by " " when there's no single field per row. */
  valueFromAll?: string[];
  /** Page id to deep-link the row's "Change" action to. */
  changeFormId: string;
};

export type SummaryEntriesBlock = {
  /** Looping journey to enumerate. */
  fromJourneyId: string;
  /**
   * Per-entry group heading template; `{n}` is replaced with the 1-based
   * entry index, e.g. "Occupier of the land {n}".
   */
  groupLabel: string;
  rows: SummaryEntryRow[];
  /** "Add another …" link label below the entries. */
  addAnotherLabel: string;
  /** Remove-link label (rendered only when entries.length > 1). */
  removeLabel?: string;
  /**
   * Optional gate. When set, the entries block (and its "Add another" CTA)
   * only renders if `valueFrom` resolves non-empty AND equals `equals`
   * (when `equals` is provided). Lets a Yes/No header answer suppress the
   * looping section entirely on the Yes path.
   */
  showWhen?: { valueFrom: string; equals?: string };
};

/**
 * Summary schema for a journey. Lives in its own `summary-schema.json`
 * per journey (alongside `form-schemas.json`). Always addressable at the
 * fixed route `/journeys/{journeyId}/summary` — there's no `formId`
 * because the route is conventional, mirroring `confirmation`.
 *
 * Supports static `headerRows` (e.g. a Yes/No radio answer with Change
 * link) plus an optional `entries` block that enumerates a looping child
 * journey's repeatable entries with Change / Remove actions and an
 * "Add another …" CTA.
 */
export type SummarySchema = {
  journeyId: string;
  title: string;
  caption?: string;
  description?: string;
  back?: string;
  /** Where the submit goes after marking the journey complete. */
  next: string;
  /** Static rows shown above any entries block (e.g. radio Q1 answer). */
  headerRows?: SummaryRow[];
  /** Repeatable-entry block (looping). */
  entries?: SummaryEntriesBlock;
  submitLabel?: string;
  /** Footer buttons (Continue / Save as draft / etc.). */
  footerActions?: TaskListFooterAction[];
  schemaVersion?: string;
};

/** Discriminated union of every top-level schema. */
export type Schema =
  | ({ schemaType: 'form' } & FormSchema)
  | ({ schemaType: 'summary' } & SummarySchema)
  | ({ schemaType: 'task-list' } & TaskListSchema)
  | ({ schemaType: 'confirmation' } & ConfirmationSchema);
