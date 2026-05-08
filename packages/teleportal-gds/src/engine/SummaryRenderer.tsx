/**
 * Renders a SummarySchema loaded from a journey's `summary-schema.json`.
 * Shows static `headerRows` (resolved through SummaryRow.valueFrom) plus
 * an optional `entries` block that enumerates a looping child journey's
 * entries with Change / Remove links and an "Add another …" CTA.
 *
 * Submitting the Continue form marks the current journey complete and
 * navigates via `schema.next` (typically `'task-list'`).
 */

import type { ReactElement } from 'react';

import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { SummaryList, type SummaryListRow } from '../components/SummaryList';
import { BLOB_PATHS } from '../shared/constants/index';
import type { ParentState } from '../shared/types/journey.types';
import type {
  SummaryEntriesBlock,
  SummaryRow,
  SummarySchema,
  TaskListFooterAction,
} from '../shared/types/schema.types';
import {
  loadOrInitParent,
  resolveValueFromEntry,
  resolveValueFromPath,
} from '../shared/utils/data.utils';
import {
  resolveBackPath,
  resolveInstanceFormPath,
  resolveRemoveInstancePath,
} from '../shared/utils/navigation.utils';
import { readBlob } from '../shared/utils/storage.utils';
import {
  addInstanceAction,
  completeJourneyAction,
  taskListFooterAction,
} from './formActions';

export type SummaryRendererProps = {
  applicationId: string;
  journeyId: string;
  schema: SummarySchema;
  parent: ParentState;
};

function renderHeaderRow(
  row: SummaryRow,
  applicationId: string,
  journeyId: string,
  parent: ParentState,
): SummaryListRow {
  const v = resolveValueFromPath(parent, journeyId, row.valueFrom);
  const text = typeof v === 'string' ? v : v === undefined ? '' : String(v);
  return {
    key: row.key,
    value: text,
    action: {
      href: `/applications/${applicationId}/journeys/${journeyId}/${row.changeLink}`,
      text: 'Change',
      visuallyHiddenText: row.key.toLowerCase(),
    },
  };
}

function entriesBlockVisible(
  block: SummaryEntriesBlock,
  parent: ParentState,
  journeyId: string,
): boolean {
  if (!block.showWhen) return true;
  const v = resolveValueFromPath(parent, journeyId, block.showWhen.valueFrom);
  if (v === undefined || v === null || v === '') return false;
  if (block.showWhen.equals !== undefined && v !== block.showWhen.equals) return false;
  return true;
}

function renderEntryRows(
  block: SummaryEntriesBlock,
  applicationId: string,
  parent: ParentState,
): ReactElement[] {
  const target = parent.journeys[block.fromJourneyId];
  const entries = target?.entries ?? [];
  const showRemove = entries.length > 1 && block.removeLabel !== undefined;

  return entries.map((entry, idx) => {
    const groupTitle = block.groupLabel.replace('{n}', String(idx + 1));
    const rows: SummaryListRow[] = block.rows.map((row) => {
      let text = '';
      if (row.valueFromAll && row.valueFromAll.length > 0) {
        text = row.valueFromAll
          .map((p) => resolveValueFromEntry(entry, p))
          .filter((x): x is string => typeof x === 'string' && x.length > 0)
          .join(' ');
      } else {
        const v = resolveValueFromEntry(entry, row.valueFrom);
        text = typeof v === 'string' ? v : v === undefined ? '' : String(v);
      }
      const changeHref = resolveInstanceFormPath(
        applicationId,
        block.fromJourneyId,
        row.changeFormId,
        entry._id,
      );
      return {
        key: row.key,
        value: text,
        action: {
          href: changeHref,
          text: 'Change',
          visuallyHiddenText: `${row.key.toLowerCase()} for ${groupTitle.toLowerCase()}`,
        },
      };
    });

    return (
      <div key={entry._id}>
        <h2 className="govuk-heading-m" style={{ marginTop: '2rem' }}>
          {groupTitle}
          {showRemove ? (
            <a
              className="govuk-link"
              style={{ float: 'right', fontWeight: 400, fontSize: '1rem' }}
              href={resolveRemoveInstancePath(applicationId, block.fromJourneyId, entry._id)}
            >
              {block.removeLabel}
            </a>
          ) : null}
        </h2>
        <SummaryList rows={rows} />
      </div>
    );
  });
}

function FooterActions({
  applicationId,
  actions,
}: {
  applicationId: string;
  actions: TaskListFooterAction[];
}): ReactElement | null {
  if (actions.length === 0) return null;
  return (
    <div className="govuk-button-group">
      {actions.map((a) => {
        const action = taskListFooterAction.bind(
          null,
          applicationId,
          a.actionId,
          a.redirectTo ?? '/',
        );
        return (
          <form key={a.actionId} action={action}>
            <Button type="submit" variant={a.variant ?? 'primary'}>
              {a.label}
            </Button>
          </form>
        );
      })}
    </div>
  );
}

export function SummaryRenderer(props: SummaryRendererProps): ReactElement {
  const { applicationId, journeyId, schema, parent } = props;
  const backHref = schema.back
    ? resolveBackPath(applicationId, journeyId, schema.back)
    : null;

  const headerRows: SummaryListRow[] = (schema.headerRows ?? []).map((r) =>
    renderHeaderRow(r, applicationId, journeyId, parent),
  );

  const continueAction = completeJourneyAction.bind(
    null,
    applicationId,
    journeyId,
    schema.next,
  );

  const entriesVisible = schema.entries
    ? entriesBlockVisible(schema.entries, parent, journeyId)
    : false;
  const addAnotherAction =
    schema.entries && entriesVisible
      ? addInstanceAction.bind(null, applicationId, schema.entries.fromJourneyId)
      : null;

  return (
    <>
      {backHref ? <BackLink href={backHref}>Back</BackLink> : null}
      {schema.caption ? (
        <span className="govuk-caption-l">{schema.caption}</span>
      ) : null}
      <h1 className="govuk-heading-l">{schema.title}</h1>
      {schema.description ? (
        <p className="govuk-body">{schema.description}</p>
      ) : null}
      {headerRows.length > 0 ? <SummaryList rows={headerRows} /> : null}
      {schema.entries && entriesVisible
        ? renderEntryRows(schema.entries, applicationId, parent)
        : null}
      {addAnotherAction ? (
        <div style={{ marginTop: '1.5rem' }}>
          <form action={addAnotherAction} style={{ display: 'inline' }}>
            <button
              type="submit"
              className="govuk-link"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              {schema.entries!.addAnotherLabel}
            </button>
          </form>
        </div>
      ) : null}
      <form action={continueAction} style={{ marginTop: '1.5rem' }}>
        <Button type="submit">{schema.submitLabel ?? 'Continue'}</Button>
      </form>
      <FooterActions
        applicationId={applicationId}
        actions={schema.footerActions ?? []}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page state loader — paired with the consumer's summary/page.tsx, which
// is a fixed route at /journeys/{journeyId}/summary.
// ---------------------------------------------------------------------------

export type SummaryPageState = {
  schema: SummarySchema;
  parent: ParentState;
};

export async function loadSummaryPageState(
  applicationId: string,
  journeyId: string,
): Promise<SummaryPageState> {
  const schemaBlob = await readBlob<SummarySchema>(
    BLOB_PATHS.journeySummarySchema(applicationId, journeyId),
  );
  const { state } = await loadOrInitParent(applicationId);
  return { schema: schemaBlob.data, parent: state };
}
