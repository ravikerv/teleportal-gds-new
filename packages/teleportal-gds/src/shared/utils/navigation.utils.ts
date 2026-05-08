/**
 * URL resolution. Routes mirror the blob layout in ARCHITECTURE.md §7 so
 * code paths, blob keys, and URLs all align. Components and renderers
 * always go through these helpers — never hand-build a route.
 */

export const URL_TEMPLATES = {
  taskList: (applicationId: string): string => `/applications/${applicationId}`,
  /**
   * Journey root — the consumer's Next.js page is expected to redirect to
   * the first form page of the journey schema. Linked from TaskList.
   */
  journeyEntry: (applicationId: string, journeyId: string): string =>
    `/applications/${applicationId}/journeys/${journeyId}`,
  formPage: (applicationId: string, journeyId: string, formId: string): string =>
    `/applications/${applicationId}/journeys/${journeyId}/${formId}`,
  summary: (applicationId: string, journeyId: string): string =>
    `/applications/${applicationId}/journeys/${journeyId}/summary`,
  confirmation: (applicationId: string, journeyId: string): string =>
    `/applications/${applicationId}/journeys/${journeyId}/confirmation`,
} as const;

/**
 * Resolve the URL for a form page's `next` token. Special tokens:
 *   - `'summary'`              — journey summary page
 *   - `'confirmation'`         — journey confirmation page
 *   - `'task-list'`            — application root task list
 *   - `'journey-root'`         — journey hub / task-list / summary at root
 *   - `'parent-summary'`       — parent journey's summary (only valid on a
 *                                looping journey; resolved by the action)
 *   - `'add-instance:{jid}'`   — start a new instance in journey {jid};
 *                                resolved by `addInstanceAction`
 *   - `'journey:{jid}'`        — first form of another journey
 *   - `<formId>`               — form within the current journey (default)
 *
 * Tokens that need server-side side effects (add-instance, parent-summary)
 * are handled in formActions; this resolver throws if asked to handle them.
 */
export function resolveNextPath(
  applicationId: string,
  journeyId: string,
  next: string,
): string {
  if (next === 'summary') return URL_TEMPLATES.summary(applicationId, journeyId);
  if (next === 'confirmation') return URL_TEMPLATES.confirmation(applicationId, journeyId);
  if (next === 'task-list') return URL_TEMPLATES.taskList(applicationId);
  if (next === 'journey-root') return URL_TEMPLATES.journeyEntry(applicationId, journeyId);
  if (next.startsWith('journey:')) {
    const jid = next.slice('journey:'.length);
    return URL_TEMPLATES.journeyEntry(applicationId, jid);
  }
  if (next === 'parent-summary' || next.startsWith('add-instance:')) {
    throw new Error(
      `Token '${next}' must be resolved by a server action (it has side effects or external context).`,
    );
  }
  return URL_TEMPLATES.formPage(applicationId, journeyId, next);
}

/**
 * Resolve the URL for a form page's `back` token. Same token set as
 * `resolveNextPath` (minus the action-only ones); anything else is treated
 * as a formId in the same journey.
 */
export function resolveBackPath(
  applicationId: string,
  journeyId: string,
  back: string,
): string {
  if (back === 'task-list') return URL_TEMPLATES.taskList(applicationId);
  if (back === 'summary') return URL_TEMPLATES.summary(applicationId, journeyId);
  if (back === 'journey-root') return URL_TEMPLATES.journeyEntry(applicationId, journeyId);
  if (back.startsWith('journey:')) {
    const jid = back.slice('journey:'.length);
    return URL_TEMPLATES.journeyEntry(applicationId, jid);
  }
  return URL_TEMPLATES.formPage(applicationId, journeyId, back);
}

/**
 * Build a form-page URL with an `?instance=` query string for looping
 * journeys. The form loader / action read the instance via searchParams.
 */
export function resolveInstanceFormPath(
  applicationId: string,
  journeyId: string,
  formId: string,
  instanceId: string,
): string {
  const base = URL_TEMPLATES.formPage(applicationId, journeyId, formId);
  return `${base}?instance=${encodeURIComponent(instanceId)}`;
}

/** Path to the engine's built-in remove-confirmation page for a looping entry. */
export function resolveRemoveInstancePath(
  applicationId: string,
  journeyId: string,
  instanceId: string,
): string {
  const base = URL_TEMPLATES.journeyEntry(applicationId, journeyId);
  return `${base}/_remove?instance=${encodeURIComponent(instanceId)}`;
}

export function resolveChangeLinkPath(
  applicationId: string,
  journeyId: string,
  formId: string,
): string {
  return URL_TEMPLATES.formPage(applicationId, journeyId, formId);
}

export function resolveTaskListPath(applicationId: string): string {
  return URL_TEMPLATES.taskList(applicationId);
}

export function resolveJourneyEntryPath(
  applicationId: string,
  journeyId: string,
): string {
  return URL_TEMPLATES.journeyEntry(applicationId, journeyId);
}
