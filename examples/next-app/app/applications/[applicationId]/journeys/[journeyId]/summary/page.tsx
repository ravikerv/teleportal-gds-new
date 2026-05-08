import { SchemaRenderer, loadSummaryPageState } from 'teleportal-gds';

import { ensureStorageConfigured } from '@/app/_storage';

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ applicationId: string; journeyId: string }>;
}) {
  await ensureStorageConfigured();
  const { applicationId, journeyId } = await params;
  const { schema, parent } = await loadSummaryPageState(applicationId, journeyId);
  return (
    <SchemaRenderer
      schemaType="summary"
      applicationId={applicationId}
      journeyId={journeyId}
      schema={schema}
      parent={parent}
    />
  );
}
