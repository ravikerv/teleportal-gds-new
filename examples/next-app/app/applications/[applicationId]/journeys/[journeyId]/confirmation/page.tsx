import { loadConfirmationPageState, SchemaRenderer } from 'teleportal-gds';

import { ensureStorageConfigured } from '@/app/_storage';

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ applicationId: string; journeyId: string }>;
}) {
  await ensureStorageConfigured();
  const { applicationId, journeyId } = await params;
  const { schema, parent } = await loadConfirmationPageState(
    applicationId,
    journeyId,
  );
  return (
    <SchemaRenderer
      schemaType="confirmation"
      applicationId={applicationId}
      journeyId={journeyId}
      schema={schema}
      parent={parent}
    />
  );
}
