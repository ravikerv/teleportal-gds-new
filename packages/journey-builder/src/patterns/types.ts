/**
 * Pattern library — pre-built sub-graphs the BA can drag into a journey.
 *
 * A Pattern produces a `PatternResult` describing pages to add to the
 * current journey, optionally a brand-new looping journey to add to the
 * project, and which node to select once the drop is done. Patterns are
 * pure functions of (currentJourneyId, dropPos) — the store applies them.
 */

import type {
  FormSchema,
  HubPage,
  JourneyPage,
  SummarySchema,
  TaskListJourneyPage,
} from '../schema';

export type PatternPageSpec = {
  page: JourneyPage;
  position: { x: number; y: number };
};

export type PatternNewJourney = {
  journeyId: string;
  formSchema: FormSchema;
  summarySchema?: SummarySchema;
  /** Per-node positions on the new journey's canvas. */
  layout?: Record<string, { x: number; y: number }>;
};

export type PatternResult = {
  /** Pages to append to the current journey's `formSchema.forms`. */
  pages?: PatternPageSpec[];
  /** Summary schema for the current journey (replaces any existing). */
  summarySchema?: SummarySchema;
  /** Position for the summary node on the current canvas. */
  summaryPosition?: { x: number; y: number };
  /** New journeys to add to the project. */
  newJourneys?: PatternNewJourney[];
  /** Nav-target node id to select after the drop (helps users orient). */
  selectAfter?: string;
};

export type Pattern = {
  id: string;
  label: string;
  description: string;
  apply: (
    currentJourneyId: string,
    dropPos: { x: number; y: number },
    /** Snapshot of existing form/hub/task-list ids on the current journey
     *  so the pattern can mint non-conflicting ids. */
    existingIds: {
      formIds: Set<string>;
      hubIds: Set<string>;
      taskListIds: Set<string>;
      journeyIds: Set<string>;
    },
  ) => PatternResult;
};

// ---------------------------------------------------------------------------
// Helpers used by patterns
// ---------------------------------------------------------------------------

export function uniqueId(existing: ReadonlySet<string>, prefix: string): string {
  for (let i = 1; i < 10000; i++) {
    const id = `${prefix}-${i}`;
    if (!existing.has(id)) return id;
  }
  throw new Error('Exhausted ids');
}

// Re-exports so pattern files only import from one place.
export type { JourneyPage, HubPage, TaskListJourneyPage };
