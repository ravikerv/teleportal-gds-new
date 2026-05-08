/**
 * Storage configuration for the sample app.
 *
 * The default in-memory adapter from teleportal-gds is used; we seed
 * the on-disk schema tree on first call. State persists for the
 * lifetime of the Next.js server process — restarting wipes everything,
 * which is fine for a demo.
 *
 * On-disk layout mirrors the journey hierarchy with no scaffolding folders:
 *
 *   schemas/applications/{aid}/
 *   ├── task-list-schema.json
 *   └── {parent-journey}/
 *       ├── form-schemas.json
 *       ├── summary-schema.json   (optional)
 *       └── {child-journey}/
 *           └── form-schemas.json
 *
 * Blob storage stays flat (keyed by `journeyId`), so authoring hierarchy
 * doesn't leak into URLs or blob paths. The walker below extracts the
 * `journeyId` from each schema JSON and writes to the canonical flat key
 * via `BLOB_PATHS.*`.
 *
 * For a real deployment, replace this body with:
 *
 *   setStorageAdapter(createAzureBlobStorageAdapter({
 *     accountUrl: process.env.AZURE_STORAGE_ACCOUNT_URL!,
 *     containerName: process.env.AZURE_STORAGE_CONTAINER!,
 *   }));
 */

import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { BLOB_PATHS, writeBlob } from 'teleportal-gds';

import { ensureProvidersRegistered } from './_providers';

let seeded = false;

const APPLICATION_ID = 'demo';

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

async function seedSchemaFile(file: string): Promise<void> {
  const raw = await readFile(file, 'utf8');
  const data = JSON.parse(raw);
  const fileName = basename(file);

  // Master task-list lives at the application root (no `journeyId`).
  if (fileName === 'task-list-schema.json') {
    await writeBlob(BLOB_PATHS.taskListSchema(APPLICATION_ID), data);
    return;
  }

  // All other schemas are journey-scoped — the journeyId in the JSON is
  // authoritative; on-disk path is just a hint for humans.
  if (typeof data?.journeyId !== 'string') return;

  if (fileName === 'form-schemas.json') {
    await writeBlob(BLOB_PATHS.journeyFormSchemas(APPLICATION_ID, data.journeyId), data);
  } else if (fileName === 'summary-schema.json') {
    await writeBlob(BLOB_PATHS.journeySummarySchema(APPLICATION_ID, data.journeyId), data);
  } else if (fileName === 'confirmation-schema.json') {
    await writeBlob(BLOB_PATHS.journeyConfirmationSchema(APPLICATION_ID, data.journeyId), data);
  }
}

export async function ensureStorageConfigured(): Promise<void> {
  ensureProvidersRegistered();
  if (seeded) return;
  seeded = true;
  const root = join(process.cwd(), 'schemas', 'applications', APPLICATION_ID);
  const files = await walk(root);
  for (const file of files) {
    await seedSchemaFile(file);
  }
}
