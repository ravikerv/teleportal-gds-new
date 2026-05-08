import { redirect } from 'next/navigation';
import {
  RemoveConfirmationRenderer,
  SchemaRenderer,
  loadFormPageState,
  loadRemoveConfirmationPageState,
} from 'teleportal-gds';

import { ensureStorageConfigured } from '@/app/_storage';

export default async function FormPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string; journeyId: string; formId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureStorageConfigured();
  const { applicationId, journeyId, formId } = await params;
  const sp = await searchParams;
  const instanceRaw = sp['instance'];
  const instanceId = typeof instanceRaw === 'string' ? instanceRaw : undefined;

  // Engine-reserved formIds. Next.js treats `_`-prefixed folders as private
  // (not routed), so we dispatch on these from the catch-all instead.
  if (formId === '_remove') {
    if (!instanceId) {
      redirect(`/applications/${applicationId}/journeys/${journeyId}`);
    }
    const state = await loadRemoveConfirmationPageState(
      applicationId,
      journeyId,
      instanceId,
    );
    return <RemoveConfirmationRenderer state={state} />;
  }

  const state = await loadFormPageState(applicationId, journeyId, formId, instanceId);
  return (
    <SchemaRenderer
      schemaType="form"
      applicationId={applicationId}
      journeyId={journeyId}
      schema={state.schema}
      values={state.values}
      errors={state.errors}
      dataSources={state.dataSources}
      instanceId={state.instanceId}
    />
  );
}
