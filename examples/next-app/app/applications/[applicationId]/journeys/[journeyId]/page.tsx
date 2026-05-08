import { redirect } from 'next/navigation';
import {
  SchemaRenderer,
  loadJourneyEntryPageState,
  resolveNextPath,
} from 'teleportal-gds';

import { ensureStorageConfigured } from '@/app/_storage';

export default async function JourneyEntryPage({
  params,
}: {
  params: Promise<{ applicationId: string; journeyId: string }>;
}) {
  await ensureStorageConfigured();
  const { applicationId, journeyId } = await params;

  const state = await loadJourneyEntryPageState(applicationId, journeyId);
  if (state.kind === 'redirect-to-form') {
    redirect(resolveNextPath(applicationId, journeyId, state.formId));
  }
  if (state.kind === 'task-list') {
    return (
      <SchemaRenderer
        schemaType="journey-task-list"
        applicationId={applicationId}
        journeyId={journeyId}
        schema={state.schema}
        parent={state.parent}
      />
    );
  }
  return (
    <SchemaRenderer
      schemaType="hub"
      applicationId={applicationId}
      journeyId={journeyId}
      schema={state.schema}
      parent={state.parent}
    />
  );
}
