/**
 * Server Component rendering a confirmation page from a ConfirmationSchema.
 * Resolves `referenceFrom` against parent state (typically
 * "system.referenceId", set by data.utils.markJourneyCompleted) and
 * renders the GovUK confirmation panel + next-steps content.
 *
 * `nextStepsMarkdown` is split on blank lines into paragraphs. Real
 * markdown (lists, links, emphasis) isn't rendered yet — see TODOs.
 */

import type { ReactElement } from 'react';

import { getDesignSystem } from '../design-systems/registry';
import { BLOB_PATHS } from '../shared/constants/index';
import type { JsonValue, ParentState } from '../shared/types/journey.types';
import type { ConfirmationSchema } from '../shared/types/schema.types';
import { loadOrInitParent, resolveValueFromPath } from '../shared/utils/data.utils';
import { readBlob } from '../shared/utils/storage.utils';

export type ConfirmationRendererProps = {
  applicationId: string;
  journeyId: string;
  schema: ConfirmationSchema;
  parent: ParentState;
};

function asReferenceText(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '—';
}

export function ConfirmationRenderer(props: ConfirmationRendererProps): ReactElement {
  const { journeyId, schema, parent } = props;

  const reference = resolveValueFromPath(parent, journeyId, schema.referenceFrom);
  const referenceText = asReferenceText(reference);

  const paragraphs = schema.nextStepsMarkdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const { components: c, tokens: t } = getDesignSystem();

  return (
    <>
      <c.Panel title={schema.panelTitle}>
        {schema.referenceLabel}
        <br />
        <strong>{referenceText}</strong>
      </c.Panel>
      {paragraphs.map((p, i) => (
        <p key={i} className={t.body}>
          {p}
        </p>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page state loader — pair with ConfirmationRenderer in the consumer's page.
// ---------------------------------------------------------------------------

export type ConfirmationPageState = {
  schema: ConfirmationSchema;
  parent: ParentState;
};

export async function loadConfirmationPageState(
  applicationId: string,
  journeyId: string,
): Promise<ConfirmationPageState> {
  const schemaBlob = await readBlob<ConfirmationSchema>(
    BLOB_PATHS.journeyConfirmationSchema(applicationId, journeyId),
  );
  const { state } = await loadOrInitParent(applicationId);
  return { schema: schemaBlob.data, parent: state };
}
