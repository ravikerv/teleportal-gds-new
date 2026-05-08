/**
 * Blob storage abstraction. The library only ever talks to storage through
 * the active StorageAdapter; step 9 swaps the in-memory adapter for the
 * real Azure Blob + Managed Identity implementation.
 *
 * ETags are required for optimistic concurrency on parent.json — see
 * ARCHITECTURE.md §11. Pass `ifMatchEtag = ''` to require a non-existent
 * blob (create-only); pass `undefined` for unconditional create-or-overwrite.
 */

import type { LoadedBlob } from '../types/journey.types';

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly path: string,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class NotFoundError extends StorageError {
  constructor(path: string) {
    super(`Blob not found: ${path}`, path);
    this.name = 'NotFoundError';
  }
}

export class ConcurrencyError extends StorageError {
  constructor(
    path: string,
    public readonly expectedEtag: string,
    public readonly currentEtag: string,
  ) {
    super(
      `ETag mismatch on ${path}: expected ${expectedEtag}, got ${currentEtag}`,
      path,
    );
    this.name = 'ConcurrencyError';
  }
}

export type WriteResult = {
  etag: string;
  lastModified: string;
};

export type StorageAdapter = {
  read<T>(path: string): Promise<LoadedBlob<T>>;
  tryRead<T>(path: string): Promise<LoadedBlob<T> | null>;
  write<T>(path: string, data: T, ifMatchEtag?: string): Promise<WriteResult>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
};

type InMemoryEntry = {
  json: string;
  etag: string;
  lastModified: string;
};

export function createInMemoryStorageAdapter(): StorageAdapter {
  const store = new Map<string, InMemoryEntry>();
  let etagCounter = 0;
  const nextEtag = (): string => {
    etagCounter += 1;
    return `"in-mem-${etagCounter}"`;
  };

  return {
    async read<T>(path: string): Promise<LoadedBlob<T>> {
      const entry = store.get(path);
      if (!entry) throw new NotFoundError(path);
      return {
        data: JSON.parse(entry.json) as T,
        etag: entry.etag,
        lastModified: entry.lastModified,
      };
    },

    async tryRead<T>(path: string): Promise<LoadedBlob<T> | null> {
      const entry = store.get(path);
      if (!entry) return null;
      return {
        data: JSON.parse(entry.json) as T,
        etag: entry.etag,
        lastModified: entry.lastModified,
      };
    },

    async write<T>(path: string, data: T, ifMatchEtag?: string): Promise<WriteResult> {
      const existing = store.get(path);
      if (ifMatchEtag !== undefined) {
        const currentEtag = existing?.etag ?? '';
        if (currentEtag !== ifMatchEtag) {
          throw new ConcurrencyError(path, ifMatchEtag, currentEtag);
        }
      }
      const entry: InMemoryEntry = {
        json: JSON.stringify(data),
        etag: nextEtag(),
        lastModified: new Date().toISOString(),
      };
      store.set(path, entry);
      return { etag: entry.etag, lastModified: entry.lastModified };
    },

    async exists(path: string): Promise<boolean> {
      return store.has(path);
    },

    async delete(path: string): Promise<void> {
      store.delete(path);
    },
  };
}

// ---------------------------------------------------------------------------
// Active adapter — held via a process-global Symbol.for so multiple bundles
// of the library (main bundle + Server Action chunk) all share the same
// adapter instance. A plain module-level binding would be per-bundle and
// silently desync between page reads and Server Action writes.
// ---------------------------------------------------------------------------

const ADAPTER_KEY = Symbol.for('teleportal-gds.storageAdapter');

type GlobalScope = { [k: symbol]: StorageAdapter | undefined };

function activeAdapter(): StorageAdapter {
  const g = globalThis as unknown as GlobalScope;
  let adapter = g[ADAPTER_KEY];
  if (!adapter) {
    adapter = createInMemoryStorageAdapter();
    g[ADAPTER_KEY] = adapter;
  }
  return adapter;
}

export function setStorageAdapter(adapter: StorageAdapter): void {
  (globalThis as unknown as GlobalScope)[ADAPTER_KEY] = adapter;
}

export function getStorageAdapter(): StorageAdapter {
  return activeAdapter();
}

/** Reset to a fresh in-memory adapter. Primarily for tests. */
export function resetStorageAdapter(): void {
  (globalThis as unknown as GlobalScope)[ADAPTER_KEY] = createInMemoryStorageAdapter();
}

// ---------------------------------------------------------------------------
// Convenience proxies — every util/component should call through these
// rather than touching the adapter directly.
// ---------------------------------------------------------------------------

export function readBlob<T>(path: string): Promise<LoadedBlob<T>> {
  return activeAdapter().read<T>(path);
}

export function tryReadBlob<T>(path: string): Promise<LoadedBlob<T> | null> {
  return activeAdapter().tryRead<T>(path);
}

export function writeBlob<T>(
  path: string,
  data: T,
  ifMatchEtag?: string,
): Promise<WriteResult> {
  return activeAdapter().write<T>(path, data, ifMatchEtag);
}

export function blobExists(path: string): Promise<boolean> {
  return activeAdapter().exists(path);
}

export function deleteBlob(path: string): Promise<void> {
  return activeAdapter().delete(path);
}
