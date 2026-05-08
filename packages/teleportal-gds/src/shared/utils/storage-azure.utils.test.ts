import { describe, expect, it } from 'vitest';

import { createAzureBlobStorageAdapter } from './storage-azure.utils';

describe('storage-azure.utils — interface conformance', () => {
  it('returns an object satisfying the StorageAdapter shape', () => {
    const adapter = createAzureBlobStorageAdapter({
      accountUrl: 'https://example.blob.core.windows.net',
      containerName: 'test',
    });
    expect(typeof adapter.read).toBe('function');
    expect(typeof adapter.tryRead).toBe('function');
    expect(typeof adapter.write).toBe('function');
    expect(typeof adapter.exists).toBe('function');
    expect(typeof adapter.delete).toBe('function');
  });
});

/**
 * Real-Azure integration smoke test. Skipped unless the env vars are set,
 * so CI runs are deterministic. To run locally:
 *
 *   GDS_AZURE_TEST_ACCOUNT_URL='https://<account>.blob.core.windows.net' \
 *   GDS_AZURE_TEST_CONTAINER='<container>' \
 *   npm test -- storage-azure
 *
 * Requires the runner identity to have **Storage Blob Data Contributor**
 * on the container.
 */
const accountUrl = process.env.GDS_AZURE_TEST_ACCOUNT_URL;
const containerName = process.env.GDS_AZURE_TEST_CONTAINER;
const integrationEnabled = Boolean(accountUrl && containerName);

describe.skipIf(!integrationEnabled)('storage-azure.utils — integration (real Azure)', () => {
  const adapter = createAzureBlobStorageAdapter({
    accountUrl: accountUrl ?? '',
    containerName: containerName ?? '',
  });
  const testPath = `_teleportal-gds-test/${Date.now()}.json`;

  it('round-trips data through write → read → delete', async () => {
    const written = await adapter.write(testPath, { hello: 'world' });
    expect(written.etag).toBeTruthy();

    const loaded = await adapter.read<{ hello: string }>(testPath);
    expect(loaded.data).toEqual({ hello: 'world' });
    expect(loaded.etag).toBe(written.etag);

    expect(await adapter.exists(testPath)).toBe(true);

    await adapter.delete(testPath);
    expect(await adapter.exists(testPath)).toBe(false);
  });
});
