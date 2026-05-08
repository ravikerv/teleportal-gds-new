import { loadOrInitParent } from 'teleportal-gds';

import { ensureStorageConfigured } from '@/app/_storage';

// Bypass Next.js's static cache — we want the freshest view of in-memory
// state on every navigation.
export const dynamic = 'force-dynamic';

export default async function DebugPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  await ensureStorageConfigured();
  const { applicationId } = await params;
  const { state, etag } = await loadOrInitParent(applicationId);

  return (
    <>
      <h1 className="govuk-heading-l">Debug: parent state</h1>
      <p className="govuk-body">
        Live view of <code>parent.json</code> for application{' '}
        <strong>{applicationId}</strong>. Reload the page after each form submit to
        see the updated structure.
      </p>
      <p className="govuk-body-s">
        ETag: <code>{etag ?? '(unset — no writes yet)'}</code>
      </p>
      <pre
        style={{
          background: '#f3f2f1',
          border: '1px solid #b1b4b6',
          padding: '1rem',
          overflow: 'auto',
          fontSize: '0.9rem',
          lineHeight: 1.4,
        }}
      >
        {JSON.stringify(state, null, 2)}
      </pre>
      <p className="govuk-body">
        <a className="govuk-link" href={`/applications/${applicationId}`}>
          Back to task list
        </a>
      </p>
    </>
  );
}
