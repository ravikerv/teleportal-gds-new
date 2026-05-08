/**
 * Built-in remove-confirmation page for a looping-journey entry. Reuses
 * the parent journey's SummaryPage `entries.rows` to render the entry's
 * fields, and wires the engine's `removeInstanceAction` behind the
 * "Yes, remove" button.
 *
 * Route: `/applications/{aid}/journeys/{jid}/_remove?instance={iid}`
 * where `jid` is the *looping* journey's id (e.g. `occupier-details`).
 */

import type { ReactElement } from 'react';

import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { SummaryList, type SummaryListRow } from '../components/SummaryList';
import { BLOB_PATHS } from '../shared/constants/index';
import type { JourneyEntry, ParentState } from '../shared/types/journey.types';
import type {
  FormSchema,
  SummaryEntriesBlock,
  SummarySchema,
} from '../shared/types/schema.types';
import {
  findEntry,
  loadOrInitParent,
  resolveValueFromEntry,
} from '../shared/utils/data.utils';
import { readBlob } from '../shared/utils/storage.utils';
import { removeInstanceAction } from './formActions';

export type RemoveConfirmationPageState = {
  applicationId: string;
  /** The looping journey id. */
  journeyId: string;
  instanceId: string;
  title: string;
  rows: SummaryListRow[];
  parentSummaryPath: string;
  removeButtonLabel: string;
  keepButtonLabel: string;
};

export async function loadRemoveConfirmationPageState(
  applicationId: string,
  journeyId: string,
  instanceId: string,
): Promise<RemoveConfirmationPageState> {
  const schemaBlob = await readBlob<FormSchema>(
    BLOB_PATHS.journeyFormSchemas(applicationId, journeyId),
  );
  if (!schemaBlob.data.looping) {
    throw new Error(`Journey '${journeyId}' is not a looping journey.`);
  }
  const { parentJourneyId } = schemaBlob.data.looping;

  const parentSummaryBlob = await readBlob<SummarySchema>(
    BLOB_PATHS.journeySummarySchema(applicationId, parentJourneyId),
  );
  if (!parentSummaryBlob.data.entries) {
    throw new Error(
      `Parent '${parentJourneyId}' summary-schema.json has no entries block — cannot drive remove flow.`,
    );
  }
  const block = parentSummaryBlob.data.entries;

  const { state: parent } = await loadOrInitParent(applicationId);
  const journey = parent.journeys[journeyId];
  const entry = findEntry(journey, instanceId);
  if (!entry) throw new Error(`Entry '${instanceId}' not found on '${journeyId}'.`);
  const idx = (journey?.entries ?? []).findIndex((e) => e._id === instanceId);
  const groupTitle = block.groupLabel.replace('{n}', String(idx + 1));
  const groupNoun = block.groupLabel.replace('{n}', '').trim().toLowerCase();

  return {
    applicationId,
    journeyId,
    instanceId,
    title: `Are you sure you want to remove this ${groupNoun}?`,
    rows: buildRows(entry, block, parent),
    parentSummaryPath: `/applications/${applicationId}/journeys/${parentJourneyId}/summary`,
    removeButtonLabel: block.removeLabel
      ? `Yes, remove this ${groupNoun}`
      : `Yes, remove this ${groupTitle.toLowerCase()}`,
    keepButtonLabel: `No, keep this ${groupNoun}`,
  };
}

function buildRows(
  entry: JourneyEntry,
  block: SummaryEntriesBlock,
  _parent: ParentState,
): SummaryListRow[] {
  return block.rows.map((row) => {
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
    return { key: row.key, value: text };
  });
}

export type RemoveConfirmationRendererProps = {
  state: RemoveConfirmationPageState;
};

export function RemoveConfirmationRenderer({
  state,
}: RemoveConfirmationRendererProps): ReactElement {
  const yesAction = removeInstanceAction.bind(
    null,
    state.applicationId,
    state.journeyId,
    state.instanceId,
  );
  return (
    <>
      <BackLink href={state.parentSummaryPath}>Back</BackLink>
      <h1 className="govuk-heading-l">{state.title}</h1>
      <SummaryList rows={state.rows} />
      <div className="govuk-button-group">
        <form action={yesAction}>
          <Button type="submit" variant="warning">
            {state.removeButtonLabel}
          </Button>
        </form>
        <Button type="button" variant="secondary" href={state.parentSummaryPath}>
          {state.keepButtonLabel}
        </Button>
      </div>
    </>
  );
}
