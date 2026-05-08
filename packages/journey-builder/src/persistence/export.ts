/**
 * Export a Project to a ZIP that drops straight into the runtime app's
 * `schemas/applications/{applicationId}/` folder.
 *
 * Layout:
 *   applications/{aid}/
 *   ├── task-list-schema.json
 *   ├── {top-level-journey}/
 *   │   ├── form-schemas.json
 *   │   ├── summary-schema.json   (when present)
 *   │   └── {child-journey}/...
 */

import JSZip from 'jszip';

import type { Project } from '../store';
import { computeJourneyPaths } from './paths';

export async function exportProjectZip(project: Project): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder(`applications/${project.applicationId}`);
  if (!root) throw new Error('Failed to create root folder in zip');

  // Master task-list at the application root.
  root.file('task-list-schema.json', JSON.stringify(project.taskList, null, 2));

  const paths = computeJourneyPaths(project);
  for (const [jid, journey] of Object.entries(project.journeys)) {
    const dir = paths[jid] ?? jid;
    const folder = root.folder(dir);
    if (!folder) continue;
    folder.file(
      'form-schemas.json',
      JSON.stringify(journey.formSchema, null, 2),
    );
    if (journey.summarySchema) {
      folder.file(
        'summary-schema.json',
        JSON.stringify(journey.summarySchema, null, 2),
      );
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

/** Trigger a download of the given blob with the supplied filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
