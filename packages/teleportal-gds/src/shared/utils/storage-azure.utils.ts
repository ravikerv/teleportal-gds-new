/**
 * Azure Blob Storage adapter for the StorageAdapter interface.
 *
 * Authentication is via `DefaultAzureCredential` from @azure/identity, so
 * the same code works under Managed Identity (production), Workload Identity
 * (Kubernetes), or `az login` (local dev) — no connection strings or SAS
 * tokens. Required RBAC role on the container: **Storage Blob Data
 * Contributor** (read+write+delete) on the account or container scope.
 *
 * Optimistic concurrency:
 *   - `ifMatchEtag === undefined` → unconditional create-or-overwrite.
 *   - `ifMatchEtag === ''`        → fail if the blob already exists.
 *   - `ifMatchEtag === '"…"'`     → fail unless the current etag matches.
 *
 * Azure SDKs are loaded via dynamic `import()` so non-Azure consumers
 * (e.g. those running tests with the in-memory adapter) don't have to
 * install `@azure/storage-blob` or `@azure/identity`.
 */

import type { ContainerClient } from '@azure/storage-blob';

import type { LoadedBlob } from '../types/journey.types';
import {
  ConcurrencyError,
  NotFoundError,
  type StorageAdapter,
  type WriteResult,
} from './storage.utils';

export type AzureBlobStorageOptions = {
  /** Account URL, e.g. `https://mystorageaccount.blob.core.windows.net`. */
  accountUrl: string;
  containerName: string;
};

function isStatusError(err: unknown, code: number): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const candidate = err as { statusCode?: unknown };
  return typeof candidate.statusCode === 'number' && candidate.statusCode === code;
}

async function streamToBuffer(stream: NodeJS.ReadableStream | undefined): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function createAzureBlobStorageAdapter(
  options: AzureBlobStorageOptions,
): StorageAdapter {
  let containerClientPromise: Promise<ContainerClient> | null = null;

  async function getContainerClient(): Promise<ContainerClient> {
    if (!containerClientPromise) {
      containerClientPromise = (async () => {
        let storageBlob: typeof import('@azure/storage-blob');
        let identity: typeof import('@azure/identity');
        try {
          [storageBlob, identity] = await Promise.all([
            import('@azure/storage-blob'),
            import('@azure/identity'),
          ]);
        } catch (err) {
          throw new Error(
            'Azure adapter requires @azure/storage-blob and @azure/identity. ' +
              'Install them: npm install @azure/storage-blob @azure/identity',
            { cause: err },
          );
        }
        const credential = new identity.DefaultAzureCredential();
        const serviceClient = new storageBlob.BlobServiceClient(
          options.accountUrl,
          credential,
        );
        return serviceClient.getContainerClient(options.containerName);
      })();
    }
    return containerClientPromise;
  }

  return {
    async read<T>(path: string): Promise<LoadedBlob<T>> {
      const container = await getContainerClient();
      const blobClient = container.getBlobClient(path);
      try {
        const dl = await blobClient.download();
        const buffer = await streamToBuffer(dl.readableStreamBody);
        return {
          data: JSON.parse(buffer.toString('utf8')) as T,
          etag: dl.etag ?? '',
          lastModified: dl.lastModified?.toISOString(),
        };
      } catch (err) {
        if (isStatusError(err, 404)) throw new NotFoundError(path);
        throw err;
      }
    },

    async tryRead<T>(path: string): Promise<LoadedBlob<T> | null> {
      const container = await getContainerClient();
      const blobClient = container.getBlobClient(path);
      try {
        const dl = await blobClient.download();
        const buffer = await streamToBuffer(dl.readableStreamBody);
        return {
          data: JSON.parse(buffer.toString('utf8')) as T,
          etag: dl.etag ?? '',
          lastModified: dl.lastModified?.toISOString(),
        };
      } catch (err) {
        if (isStatusError(err, 404)) return null;
        throw err;
      }
    },

    async write<T>(path: string, data: T, ifMatchEtag?: string): Promise<WriteResult> {
      const container = await getContainerClient();
      const blockBlobClient = container.getBlockBlobClient(path);
      const json = JSON.stringify(data);
      const conditions =
        ifMatchEtag === undefined
          ? undefined
          : ifMatchEtag === ''
            ? { ifNoneMatch: '*' }
            : { ifMatch: ifMatchEtag };
      try {
        const result = await blockBlobClient.upload(json, Buffer.byteLength(json, 'utf8'), {
          blobHTTPHeaders: { blobContentType: 'application/json; charset=utf-8' },
          conditions,
        });
        return {
          etag: result.etag ?? '',
          lastModified:
            result.lastModified?.toISOString() ?? new Date().toISOString(),
        };
      } catch (err) {
        if (isStatusError(err, 412)) {
          throw new ConcurrencyError(path, ifMatchEtag ?? '', '<unknown>');
        }
        throw err;
      }
    },

    async exists(path: string): Promise<boolean> {
      const container = await getContainerClient();
      return await container.getBlobClient(path).exists();
    },

    async delete(path: string): Promise<void> {
      const container = await getContainerClient();
      await container.getBlobClient(path).deleteIfExists();
    },
  };
}
