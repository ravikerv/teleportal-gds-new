import { loadTaskListPageState, SchemaRenderer } from 'teleportal-gds';

import { ensureStorageConfigured } from '@/app/_storage';

export default async function TaskListPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  await ensureStorageConfigured();
  const { applicationId } = await params;
  const { schema, parent } = await loadTaskListPageState(applicationId);
  return (
    <SchemaRenderer
      schemaType="task-list"
      applicationId={applicationId}
      schema={schema}
      parent={parent}
    />
  );
}
