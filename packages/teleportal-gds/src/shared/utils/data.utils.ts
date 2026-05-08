/**
 * Domain operations on parent + per-journey state. The contract from
 * IMPLEMENTATION_PROMPT.md is implemented here:
 *
 *   - loadParent(applicationId)
 *   - loadJourney(applicationId, journeyId)
 *   - saveAnswers(applicationId, journeyId, formId, answers)
 *       updates BOTH parent + per-journey atomically (parent is the
 *       canonical source — written first under If-Match)
 *   - resolveDependencies(parent) — pure recompute of derived fields
 *
 * All blob I/O goes through storage.utils. No direct adapter calls here.
 */

import { BLOB_PATHS } from '../constants/index';
import type {
  FormAnswers,
  JourneyEntry,
  JourneyState,
  JsonValue,
  LoadedBlob,
  ParentState,
} from '../types/journey.types';
import type {
  TaskListItem,
  TaskListSchema,
  TaskStatus,
} from '../types/schema.types';
import { blobExists, deleteBlob, tryReadBlob, writeBlob } from './storage.utils';

function nowIso(): string {
  return new Date().toISOString();
}

function createInitialParent(applicationId: string): ParentState {
  return {
    applicationId,
    journeys: {},
    system: {},
    updatedAt: nowIso(),
  };
}

function createInitialJourney(applicationId: string, journeyId: string): JourneyState {
  return {
    applicationId,
    journeyId,
    status: 'not-started',
    answers: {},
    updatedAt: nowIso(),
  };
}

export async function loadParent(
  applicationId: string,
): Promise<LoadedBlob<ParentState> | null> {
  return await tryReadBlob<ParentState>(BLOB_PATHS.parent(applicationId));
}

export async function loadOrInitParent(
  applicationId: string,
): Promise<{ state: ParentState; etag: string | undefined }> {
  const blob = await loadParent(applicationId);
  if (blob) return { state: blob.data, etag: blob.etag };
  return { state: createInitialParent(applicationId), etag: undefined };
}

export async function loadJourney(
  applicationId: string,
  journeyId: string,
): Promise<LoadedBlob<JourneyState> | null> {
  return await tryReadBlob<JourneyState>(BLOB_PATHS.journeyData(applicationId, journeyId));
}

export async function loadOrInitJourney(
  applicationId: string,
  journeyId: string,
): Promise<{ state: JourneyState; etag: string | undefined }> {
  const blob = await loadJourney(applicationId, journeyId);
  if (blob) return { state: blob.data, etag: blob.etag };
  return { state: createInitialJourney(applicationId, journeyId), etag: undefined };
}

/**
 * Pure recompute of derived parent fields. Currently downgrades inferred
 * journey statuses from answer presence — `completed` and `cannot-start`
 * are sticky (only changed by the engine / task-list resolver).
 *
 * TODO (later step): once the task-list schema is in scope, factor in
 * dependsOn graph traversal here so cross-journey deps land in one place.
 */
export function resolveDependencies(parent: ParentState): ParentState {
  const updatedJourneys: Record<string, JourneyState> = {};
  for (const [journeyId, journey] of Object.entries(parent.journeys)) {
    const hasAnyAnswers = Object.values(journey.answers).some(
      (forms) => Object.keys(forms).length > 0,
    );
    let status = journey.status;
    if (status !== 'completed' && status !== 'cannot-start') {
      status = hasAnyAnswers ? 'in-progress' : 'not-started';
    }
    updatedJourneys[journeyId] = { ...journey, status };
  }
  return { ...parent, journeys: updatedJourneys };
}

/**
 * Persist a form's answers and keep parent + per-journey JSON in sync.
 *
 * Order:
 *   1. Read both blobs (with etags).
 *   2. Merge new answers into journey state.
 *   3. Recompute derived parent fields.
 *   4. Write parent first under If-Match (canonical source).
 *   5. Write per-journey blob under If-Match (denormalised view).
 *
 * If step 4 throws ConcurrencyError, the caller should reload and retry.
 * If step 5 throws, parent already holds the truth — the per-journey blob
 * is rebuildable from parent on the next read.
 */
export async function saveAnswers(
  applicationId: string,
  journeyId: string,
  formId: string,
  answers: FormAnswers,
): Promise<void> {
  const { state: parentState, etag: parentEtag } = await loadOrInitParent(applicationId);
  const { state: journeyState, etag: journeyEtag } = await loadOrInitJourney(
    applicationId,
    journeyId,
  );

  const ts = nowIso();

  const updatedJourney: JourneyState = {
    ...journeyState,
    answers: {
      ...journeyState.answers,
      [formId]: {
        ...(journeyState.answers[formId] ?? {}),
        ...answers,
      },
    },
    updatedAt: ts,
  };

  const mergedParent: ParentState = {
    ...parentState,
    journeys: {
      ...parentState.journeys,
      [journeyId]: updatedJourney,
    },
    updatedAt: ts,
  };

  const resolvedParent = resolveDependencies(mergedParent);
  const resolvedJourney = resolvedParent.journeys[journeyId] ?? updatedJourney;

  await writeBlob(BLOB_PATHS.parent(applicationId), resolvedParent, parentEtag);
  await writeBlob(
    BLOB_PATHS.journeyData(applicationId, journeyId),
    resolvedJourney,
    journeyEtag,
  );
}

/**
 * Resolve a `valueFrom` path from a SummarySchema row (or similar) to its
 * concrete value in parent state. Path syntax:
 *   - "system.<key>[...]" — looks under parent.system
 *   - "<formId>.<fieldId>[...]" — looks under the current journey's answers
 *
 * Cross-journey paths (e.g. "address.address-page.postcode") aren't
 * supported yet; flag a TODO when SummaryRenderer needs them.
 */
/**
 * Mark a journey as completed and persist parent + per-journey blobs in sync.
 * Generates a placeholder `system.referenceId` if one isn't set yet so that
 * `confirmation` pages have something to render via `referenceFrom`.
 *
 * Real integrations (e.g. backend reference issuance) should override the
 * generated id by writing to `parent.system.referenceId` before this is
 * called, or by replacing this function via a custom data adapter.
 */
export async function markJourneyCompleted(
  applicationId: string,
  journeyId: string,
): Promise<void> {
  const { state: parentState, etag: parentEtag } = await loadOrInitParent(applicationId);
  const journeyBlob = await loadJourney(applicationId, journeyId);
  const journeyEtag = journeyBlob?.etag;

  const existing =
    parentState.journeys[journeyId] ??
    journeyBlob?.data ??
    createInitialJourney(applicationId, journeyId);

  const ts = nowIso();
  const completedJourney: JourneyState = {
    ...existing,
    status: 'completed',
    updatedAt: ts,
  };

  const system =
    parentState.system.referenceId !== undefined
      ? parentState.system
      : { ...parentState.system, referenceId: generateReferenceId(applicationId) };

  const updatedParent: ParentState = {
    ...parentState,
    journeys: { ...parentState.journeys, [journeyId]: completedJourney },
    system,
    updatedAt: ts,
  };

  await writeBlob(BLOB_PATHS.parent(applicationId), updatedParent, parentEtag);
  await writeBlob(
    BLOB_PATHS.journeyData(applicationId, journeyId),
    completedJourney,
    journeyEtag,
  );
}

function generateReferenceId(applicationId: string): string {
  // Demo-grade id. Real integrations should overwrite via custom logic.
  const stamp = Date.now().toString(36).toUpperCase();
  const slug = applicationId.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
  return `REF-${slug || 'APP'}-${stamp}`;
}

/**
 * Resolve a task's effective status at render time. Combines the schema's
 * declared status, the runtime journey status from parent state, and the
 * `dependsOn` graph (any incomplete dep makes a task `cannot-start`).
 */
export function computeTaskStatus(
  task: TaskListItem,
  parent: ParentState,
  schema: TaskListSchema,
): TaskStatus {
  if (task.dependsOn && task.dependsOn.length > 0) {
    const allTasks = collectAllTasks(schema);
    const allDepsComplete = task.dependsOn.every((depId) => {
      const dep = allTasks.find((t) => t.id === depId);
      if (!dep) return false;
      const depJourneyId = dep.type === 'nested-journey' ? dep.journeyRef : dep.id;
      return parent.journeys[depJourneyId]?.status === 'completed';
    });
    if (!allDepsComplete) return 'cannot-start';
  }
  const journeyId = task.type === 'nested-journey' ? task.journeyRef : task.id;
  return parent.journeys[journeyId]?.status ?? task.status;
}

function collectAllTasks(schema: TaskListSchema): TaskListItem[] {
  if (schema.sections && schema.sections.length > 0) {
    return schema.sections.flatMap((s) => s.tasks);
  }
  return schema.tasks ?? [];
}

// ---------------------------------------------------------------------------
// Form draft state (transient per-form-page blob used to round-trip
// validation errors + just-submitted values across a redirect).
// ---------------------------------------------------------------------------

export type FormDraft = {
  values: FormAnswers;
  errors: Record<string, string>;
};

/** Persist the user's invalid submission so the page can re-render with errors. */
export async function saveDraft(
  applicationId: string,
  journeyId: string,
  formId: string,
  draft: FormDraft,
): Promise<void> {
  await writeBlob(
    BLOB_PATHS.journeyFormDraft(applicationId, journeyId, formId),
    draft,
  );
}

/** Read the pending draft and delete it atomically. Returns null when absent. */
export async function consumeDraft(
  applicationId: string,
  journeyId: string,
  formId: string,
): Promise<FormDraft | null> {
  const path = BLOB_PATHS.journeyFormDraft(applicationId, journeyId, formId);
  const blob = await tryReadBlob<FormDraft>(path);
  if (!blob) return null;
  await deleteBlob(path);
  return blob.data;
}

/** Drop a draft without reading it (used after a successful save). */
export async function clearDraft(
  applicationId: string,
  journeyId: string,
  formId: string,
): Promise<void> {
  const path = BLOB_PATHS.journeyFormDraft(applicationId, journeyId, formId);
  if (await blobExists(path)) {
    await deleteBlob(path);
  }
}

// ---------------------------------------------------------------------------
// Looping-journey entry helpers (used by looping/summary renderers + actions).
// All writes go through saveAnswers — these wrappers just locate the right
// place in JourneyState.entries for the engine.
// ---------------------------------------------------------------------------

function makeEntryId(): string {
  // Demo-grade id; collisions are practically impossible for human-driven flows.
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function findEntry(
  journey: JourneyState | undefined,
  instanceId: string,
): JourneyEntry | undefined {
  return journey?.entries?.find((e) => e._id === instanceId);
}

/**
 * Append a fresh entry to the looping journey and return its id. Persists
 * both parent + per-journey state (parent is canonical).
 */
export async function addEntry(
  applicationId: string,
  journeyId: string,
): Promise<string> {
  const { state: parentState, etag: parentEtag } = await loadOrInitParent(applicationId);
  const { state: journeyState, etag: journeyEtag } = await loadOrInitJourney(
    applicationId,
    journeyId,
  );
  const ts = nowIso();
  const newEntry: JourneyEntry = { _id: makeEntryId(), answers: {}, updatedAt: ts };
  const updatedJourney: JourneyState = {
    ...journeyState,
    entries: [...(journeyState.entries ?? []), newEntry],
    updatedAt: ts,
  };
  const mergedParent: ParentState = {
    ...parentState,
    journeys: { ...parentState.journeys, [journeyId]: updatedJourney },
    updatedAt: ts,
  };
  const resolvedParent = resolveDependencies(mergedParent);
  const resolvedJourney = resolvedParent.journeys[journeyId] ?? updatedJourney;
  await writeBlob(BLOB_PATHS.parent(applicationId), resolvedParent, parentEtag);
  await writeBlob(
    BLOB_PATHS.journeyData(applicationId, journeyId),
    resolvedJourney,
    journeyEtag,
  );
  return newEntry._id;
}

/**
 * Persist `answers` against a single entry of a looping journey. Mirrors
 * `saveAnswers` but writes into `entries[instanceId].answers[formId]`.
 */
export async function saveEntryAnswers(
  applicationId: string,
  journeyId: string,
  instanceId: string,
  formId: string,
  answers: FormAnswers,
): Promise<void> {
  const { state: parentState, etag: parentEtag } = await loadOrInitParent(applicationId);
  const { state: journeyState, etag: journeyEtag } = await loadOrInitJourney(
    applicationId,
    journeyId,
  );
  const ts = nowIso();
  const entries = journeyState.entries ?? [];
  const idx = entries.findIndex((e) => e._id === instanceId);
  if (idx === -1) {
    throw new Error(
      `Unknown instanceId '${instanceId}' on looping journey '${journeyId}'`,
    );
  }
  const existing = entries[idx]!;
  const updatedEntry: JourneyEntry = {
    ...existing,
    answers: {
      ...existing.answers,
      [formId]: { ...(existing.answers[formId] ?? {}), ...answers },
    },
    updatedAt: ts,
  };
  const updatedEntries = [...entries];
  updatedEntries[idx] = updatedEntry;
  const updatedJourney: JourneyState = {
    ...journeyState,
    entries: updatedEntries,
    updatedAt: ts,
  };
  const mergedParent: ParentState = {
    ...parentState,
    journeys: { ...parentState.journeys, [journeyId]: updatedJourney },
    updatedAt: ts,
  };
  const resolvedParent = resolveDependencies(mergedParent);
  const resolvedJourney = resolvedParent.journeys[journeyId] ?? updatedJourney;
  await writeBlob(BLOB_PATHS.parent(applicationId), resolvedParent, parentEtag);
  await writeBlob(
    BLOB_PATHS.journeyData(applicationId, journeyId),
    resolvedJourney,
    journeyEtag,
  );
}

/** Remove an entry from a looping journey. Silent no-op if id is unknown. */
export async function removeEntry(
  applicationId: string,
  journeyId: string,
  instanceId: string,
): Promise<void> {
  const { state: parentState, etag: parentEtag } = await loadOrInitParent(applicationId);
  const journeyBlob = await loadJourney(applicationId, journeyId);
  if (!journeyBlob) return;
  const journey = journeyBlob.data;
  const ts = nowIso();
  const updatedEntries = (journey.entries ?? []).filter((e) => e._id !== instanceId);
  const updatedJourney: JourneyState = {
    ...journey,
    entries: updatedEntries,
    updatedAt: ts,
  };
  const mergedParent: ParentState = {
    ...parentState,
    journeys: { ...parentState.journeys, [journeyId]: updatedJourney },
    updatedAt: ts,
  };
  await writeBlob(BLOB_PATHS.parent(applicationId), mergedParent, parentEtag);
  await writeBlob(
    BLOB_PATHS.journeyData(applicationId, journeyId),
    updatedJourney,
    journeyBlob.etag,
  );
}

/**
 * Resolve a value path within a single entry's answers (e.g.
 * `details-page.firstName`). Mirrors `resolveValueFromPath`'s journey-local
 * branch but rooted at the entry instead of the journey.
 */
export function resolveValueFromEntry(
  entry: JourneyEntry,
  valueFrom: string,
): JsonValue | undefined {
  const parts = valueFrom.split('.');
  if (parts.length < 2) return undefined;
  const [formId, fieldId, ...rest] = parts;
  if (!formId || !fieldId) return undefined;
  const formAnswers = entry.answers[formId];
  if (!formAnswers) return undefined;
  let cursor: JsonValue | undefined = formAnswers[fieldId];
  for (const part of rest) {
    if (cursor === null || typeof cursor !== 'object' || Array.isArray(cursor)) {
      return undefined;
    }
    cursor = (cursor as { [k: string]: JsonValue })[part];
    if (cursor === undefined) return undefined;
  }
  return cursor;
}

export function resolveValueFromPath(
  parent: ParentState,
  currentJourneyId: string,
  valueFrom: string,
): JsonValue | undefined {
  const parts = valueFrom.split('.');
  if (parts.length < 2) return undefined;

  if (parts[0] === 'system') {
    let cursor: JsonValue | undefined = parent.system as unknown as JsonValue;
    for (let i = 1; i < parts.length; i++) {
      const key = parts[i];
      if (key === undefined) return undefined;
      if (cursor === null || typeof cursor !== 'object' || Array.isArray(cursor)) {
        return undefined;
      }
      cursor = (cursor as { [k: string]: JsonValue })[key];
      if (cursor === undefined) return undefined;
    }
    return cursor;
  }

  const journey = parent.journeys[currentJourneyId];
  if (!journey) return undefined;
  const [formId, fieldId, ...rest] = parts;
  if (!formId || !fieldId) return undefined;
  const formAnswers = journey.answers[formId];
  if (!formAnswers) return undefined;

  let cursor: JsonValue | undefined = formAnswers[fieldId];
  for (const part of rest) {
    if (cursor === null || typeof cursor !== 'object' || Array.isArray(cursor)) {
      return undefined;
    }
    cursor = (cursor as { [k: string]: JsonValue })[part];
    if (cursor === undefined) return undefined;
  }
  return cursor;
}
