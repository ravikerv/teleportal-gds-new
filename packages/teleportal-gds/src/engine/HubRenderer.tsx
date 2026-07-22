/**
 * Server Component rendering a hub page from a HubPage entry inside a
 * FormSchema. A hub is the "manage" landing screen for a journey made of
 * multiple sub-forms (think "Manage contact details": one row per contact
 * piece, each with an Add or Change link, plus a Continue button that
 * marks the journey complete and navigates `schema.next`).
 *
 * Each `HubItem.sources` is walked in order; the first source whose
 * `valueFrom` resolves non-empty (and matches `equals` if set) wins. The
 * row's display is `literal`, otherwise `displayPaths` joined by newline,
 * otherwise the resolved value itself. When no source matches the row
 * renders an Add link to `item.link`.
 *
 * The Continue button posts to `completeJourneyAction` which marks the
 * journey complete and redirects via the `schema.next` token.
 */

import type { ReactElement } from 'react';

import type { SummaryListRow } from '../components/SummaryList';
import { getDesignSystem } from '../design-systems/registry';
import { BLOB_PATHS } from '../shared/constants/index';
import type { JsonValue, ParentState } from '../shared/types/journey.types';
import type {
  FormSchema,
  HubItem,
  HubItemSource,
  HubPage,
  TaskListJourneyPage,
} from '../shared/types/schema.types';
import { loadOrInitParent, resolveValueFromPath } from '../shared/utils/data.utils';
import {
  resolveBackPath,
  resolveNextPath,
} from '../shared/utils/navigation.utils';
import {
  findHubPage,
  findTaskListPage,
  getFirstFormPage,
} from '../shared/utils/schema.utils';
import { readBlob } from '../shared/utils/storage.utils';
import { completeJourneyAction } from './formActions';

export type HubRendererProps = {
  applicationId: string;
  journeyId: string;
  schema: HubPage;
  parent: ParentState;
};

function isPresent(v: JsonValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function resolveSource(
  source: HubItemSource,
  parent: ParentState,
  journeyId: string,
): string | null {
  const v = resolveValueFromPath(parent, journeyId, source.valueFrom);
  if (!isPresent(v)) return null;
  if (source.equals !== undefined && v !== source.equals) return null;

  if (source.literal !== undefined) return source.literal;
  if (source.displayPaths && source.displayPaths.length > 0) {
    return source.displayPaths
      .map((p) => resolveValueFromPath(parent, journeyId, p))
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
      .join('\n');
  }
  return typeof v === 'string' ? v : String(v);
}

type RenderedRow = { item: HubItem; matched: string | null };

function renderItem(
  item: HubItem,
  parent: ParentState,
  journeyId: string,
): RenderedRow | null {
  if (item.showWhen) {
    const v = resolveValueFromPath(parent, journeyId, item.showWhen);
    if (!isPresent(v)) return null;
  }
  for (const src of item.sources) {
    const matched = resolveSource(src, parent, journeyId);
    if (matched !== null) return { item, matched };
  }
  return { item, matched: null };
}

export function HubRenderer(props: HubRendererProps): ReactElement {
  const { applicationId, journeyId, schema, parent } = props;
  const { components: c, tokens: t } = getDesignSystem();

  const rendered = schema.items
    .map((item) => renderItem(item, parent, journeyId))
    .filter((r): r is RenderedRow => r !== null);

  const rows: SummaryListRow[] = rendered.map(({ item, matched }) => {
    const linkHref = resolveNextPath(applicationId, journeyId, item.link);
    if (matched === null) {
      return {
        key: item.key,
        value: (
          <a className={t.link} href={linkHref}>
            {item.addLabel}
          </a>
        ),
      };
    }
    return {
      key: item.key,
      value: <span style={{ whiteSpace: 'pre-line' }}>{matched}</span>,
      action: {
        href: linkHref,
        text: item.changeLabel ?? 'Change',
        visuallyHiddenText: item.key.toLowerCase(),
      },
    };
  });

  const allMatched =
    rendered.length === schema.items.length &&
    rendered.every(({ matched }) => matched !== null);
  const completeAction = completeJourneyAction.bind(
    null,
    applicationId,
    journeyId,
    schema.next,
  );
  const backHref = schema.back
    ? resolveBackPath(applicationId, journeyId, schema.back)
    : null;

  return (
    <>
      {backHref ? <c.BackLink href={backHref}>Back</c.BackLink> : null}
      <h1 className={t.headingL}>{schema.title}</h1>
      {schema.description ? (
        <p className={t.body}>{schema.description}</p>
      ) : null}
      <c.SummaryList rows={rows} />
      <form action={completeAction}>
        <c.Button type="submit" disabled={!allMatched}>
          {schema.continueLabel ?? 'Continue'}
        </c.Button>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// Journey entry loader — pair with the consumer's [journeyId]/page.tsx.
// Returns either the hub render state, or a redirect-to-form directive
// (when the journey has no hub page). Keeps the consumer's page free of
// schema-walking logic.
// ---------------------------------------------------------------------------

export type JourneyEntryPageState =
  | { kind: 'hub'; schema: HubPage; parent: ParentState }
  | { kind: 'task-list'; schema: TaskListJourneyPage; parent: ParentState }
  | { kind: 'redirect-to-form'; formId: string };

export async function loadJourneyEntryPageState(
  applicationId: string,
  journeyId: string,
): Promise<JourneyEntryPageState> {
  const schemaBlob = await readBlob<FormSchema>(
    BLOB_PATHS.journeyFormSchemas(applicationId, journeyId),
  );
  const hub = findHubPage(schemaBlob.data);
  if (hub) {
    const { state } = await loadOrInitParent(applicationId);
    return { kind: 'hub', schema: hub, parent: state };
  }
  const taskList = findTaskListPage(schemaBlob.data);
  if (taskList) {
    const { state } = await loadOrInitParent(applicationId);
    return { kind: 'task-list', schema: taskList, parent: state };
  }
  const first = getFirstFormPage(schemaBlob.data);
  if (!first) {
    throw new Error(`Journey ${journeyId} has no pages`);
  }
  return { kind: 'redirect-to-form', formId: first.formId };
}
