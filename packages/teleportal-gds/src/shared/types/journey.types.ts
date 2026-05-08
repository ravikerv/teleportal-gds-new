/**
 * Runtime state shapes — what's persisted to blob storage and shuttled
 * between server actions, data.utils, and the renderers.
 */

import type { TaskStatus } from './schema.types';

/** Recursive JSON-serialisable value. Matches what blob storage round-trips. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/** Answers for a single form page, keyed by field id. */
export type FormAnswers = Record<string, JsonValue>;

/** Answers for an entire journey, keyed by formId. */
export type JourneyAnswers = Record<string, FormAnswers>;

/** A journey's status mirrors the task-list statuses. */
export type JourneyStatus = TaskStatus;

/**
 * One repeatable record inside a looping journey. Each entry has its own
 * `_id` (engine-minted) and its own bag of per-form answers — same shape
 * as a non-looping journey's `answers` block.
 */
export type JourneyEntry = {
  _id: string;
  answers: JourneyAnswers;
  /** ISO-8601 timestamp of the last write to this entry. */
  updatedAt: string;
};

/** Per-journey persisted state. Stored at applications/{id}/data/journeys/{journeyId}.json. */
export type JourneyState = {
  applicationId: string;
  journeyId: string;
  status: JourneyStatus;
  answers: JourneyAnswers;
  /**
   * Repeatable records for looping journeys. Empty/undefined for ordinary
   * (non-looping) journeys. The schema's `looping` flag is the source of
   * truth for whether a journey is supposed to use this field.
   */
  entries?: JourneyEntry[];
  /** ISO-8601 timestamp of the last write. */
  updatedAt: string;
};

/**
 * Application-wide parent state. Stored at applications/{id}/parent.json
 * and updated atomically alongside the per-journey JSON on every save.
 */
export type ParentState = {
  applicationId: string;
  journeys: Record<string, JourneyState>;
  /** Engine-managed fields (e.g. referenceId) referenced by `referenceFrom`. */
  system: {
    referenceId?: string;
  } & JsonObject;
  /** ISO-8601 timestamp of the last write. */
  updatedAt: string;
};

/**
 * Wrapper returned by storage.utils whenever a blob is loaded. The ETag is
 * required for optimistic-concurrency writes (see ARCHITECTURE.md §11).
 */
export type LoadedBlob<T> = {
  data: T;
  etag: string;
  lastModified?: string;
};
