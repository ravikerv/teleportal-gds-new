import { beforeEach, describe, expect, it } from 'vitest';

import {
  ConcurrencyError,
  NotFoundError,
  blobExists,
  deleteBlob,
  readBlob,
  resetStorageAdapter,
  tryReadBlob,
  writeBlob,
} from './storage.utils';

beforeEach(() => {
  resetStorageAdapter();
});

describe('storage.utils — in-memory adapter', () => {
  it('round-trips data through write → read', async () => {
    await writeBlob('a/b.json', { hello: 'world' });
    const loaded = await readBlob<{ hello: string }>('a/b.json');
    expect(loaded.data).toEqual({ hello: 'world' });
    expect(loaded.etag).toMatch(/in-mem-\d+/);
  });

  it('readBlob throws NotFoundError when missing', async () => {
    await expect(readBlob('missing.json')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('tryReadBlob returns null when missing', async () => {
    expect(await tryReadBlob('missing.json')).toBeNull();
  });

  it('blobExists tracks writes and deletes', async () => {
    expect(await blobExists('x.json')).toBe(false);
    await writeBlob('x.json', { v: 1 });
    expect(await blobExists('x.json')).toBe(true);
    await deleteBlob('x.json');
    expect(await blobExists('x.json')).toBe(false);
  });

  it('writeBlob with stale ifMatchEtag throws ConcurrencyError', async () => {
    const first = await writeBlob('p.json', { v: 1 });
    await writeBlob('p.json', { v: 2 }, first.etag); // ok
    await expect(writeBlob('p.json', { v: 3 }, first.etag)).rejects.toBeInstanceOf(
      ConcurrencyError,
    );
  });

  it('writeBlob bumps etag on each successful write', async () => {
    const a = await writeBlob('e.json', { v: 1 });
    const b = await writeBlob('e.json', { v: 2 });
    expect(a.etag).not.toEqual(b.etag);
  });
});
