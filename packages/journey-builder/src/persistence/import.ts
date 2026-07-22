/**
 * Import a Project from either a ZIP file or a dragged folder. The
 * disk hierarchy doesn't matter for correctness — every journey JSON
 * carries its own `journeyId` which we use as the canonical key. We
 * just walk every `*-schema.json` we find and group them.
 */

import JSZip from 'jszip';

import type { FormSchema, SummarySchema, TaskListSchema } from '../schema';
import { buildProjectJourney, type Project, type ProjectJourney } from '../store';

type Loaded = {
  applicationId: string;
  taskList: TaskListSchema | null;
  journeys: Record<string, ProjectJourney>;
};

export async function importProjectZip(file: Blob): Promise<Project> {
  // Always normalise to ArrayBuffer so JSZip works in both browsers and
  // Node-based test runners.
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const entries: { path: string; text: string }[] = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (!path.endsWith('.json')) continue;
    entries.push({ path, text: await entry.async('string') });
  }
  return importProjectFromEntries(entries);
}

/**
 * Import from already-loaded path/text pairs — the shared core of the zip
 * and folder importers, and the entry point for programmatic sources like
 * the AI Mural import (which receives a files map over HTTP).
 */
export function importProjectFromEntries(
  entries: { path: string; text: string }[],
): Project {
  const loaded = emptyLoaded();
  for (const entry of entries) {
    if (!entry.path.endsWith('.json')) continue;
    handleFile(entry.path, entry.text, loaded);
  }
  return finalise(loaded);
}

export async function importProjectFromFiles(files: File[]): Promise<Project> {
  const loaded = emptyLoaded();
  for (const file of files) {
    if (!file.name.endsWith('.json')) continue;
    const text = await file.text();
    // For folder drag-drop, file.webkitRelativePath has the path; in plain
    // file picks it's blank. Path extraction is cosmetic — we trust the
    // schema's own `journeyId` field for grouping.
    const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    handleFile(path, text, loaded);
  }
  return finalise(loaded);
}

function emptyLoaded(): Loaded {
  return { applicationId: '', taskList: null, journeys: {} };
}

function handleFile(path: string, text: string, loaded: Loaded): void {
  const data = parseJsonOrNull(text);
  if (data === null) return;
  const filename = path.split('/').pop() ?? '';

  if (filename === 'task-list-schema.json' && !looksLikeJourney(data)) {
    loaded.taskList = data as TaskListSchema;
    // Try to extract `applications/{aid}/` from the path so we keep the
    // application id intact.
    const m = path.match(/applications\/([^/]+)\//);
    if (m && m[1]) loaded.applicationId = m[1];
    return;
  }

  if (typeof (data as { journeyId?: unknown }).journeyId !== 'string') return;
  const jid = (data as { journeyId: string }).journeyId;

  if (filename === 'form-schemas.json') {
    const formSchema = data as FormSchema;
    const existing = loaded.journeys[jid];
    // Rebuild (not spread) so formOrder is derived from THIS formSchema —
    // a summary-first file ordering would otherwise leave the placeholder's
    // empty formOrder in place and silently drop every form on export.
    loaded.journeys[jid] = buildProjectJourney(
      formSchema,
      existing?.summarySchema,
      existing?.layout ?? {},
    );
  } else if (filename === 'summary-schema.json') {
    const summarySchema = data as SummarySchema;
    const existing = loaded.journeys[jid];
    if (existing) {
      loaded.journeys[jid] = { ...existing, summarySchema };
    } else {
      // Summary arrived before forms — stash a placeholder; the forms
      // file (if present) will fill it in.
      loaded.journeys[jid] = buildProjectJourney(
        { journeyId: jid, forms: [] } as FormSchema,
        summarySchema,
      );
    }
  }
}

function finalise(loaded: Loaded): Project {
  return {
    applicationId: loaded.applicationId || 'imported',
    taskList: loaded.taskList ?? { title: '(no master task list)' },
    journeys: loaded.journeys,
  };
}

function looksLikeJourney(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as { journeyId?: unknown }).journeyId === 'string'
  );
}

function parseJsonOrNull(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
