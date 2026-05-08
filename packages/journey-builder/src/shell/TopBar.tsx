/**
 * Application top bar — breadcrumb + Import / Export / Reset controls.
 *
 *   - Import: file picker accepting .zip OR a folder (webkitdirectory).
 *     The folder picker is the more BA-friendly path because they can
 *     drop a `schemas/applications/{id}/` straight in.
 *   - Export: bundles the project into a ZIP whose layout matches what
 *     the runtime app's `_storage.ts` walker expects, then downloads it.
 *   - Reset: clears localStorage and reloads the bundled fixture so
 *     authors can recover from a broken local state.
 */

import { useMemo, useRef } from 'react';

import { loadFixtureProject } from '../fixtures';
import {
  downloadBlob,
  exportProjectZip,
} from '../persistence/export';
import {
  importProjectFromFiles,
  importProjectZip,
} from '../persistence/import';
import { MASTER_VIEW_ID, selectActiveJourney, useBuilderStore, STORAGE_KEY } from '../store';
import { buildProjectTree, type JourneyTreeNode } from '../store/tree';

export function TopBar() {
  const activeJourneyId = useBuilderStore((s) => s.activeJourneyId);
  const project = useBuilderStore((s) => s.project);
  const journey = useBuilderStore(selectActiveJourney);
  const setActiveJourney = useBuilderStore((s) => s.setActiveJourney);
  const loadProject = useBuilderStore((s) => s.loadProject);

  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const crumbs = useMemo(() => {
    const tree = buildProjectTree(project);
    if (activeJourneyId === MASTER_VIEW_ID) {
      return [{ id: MASTER_VIEW_ID, label: 'Master', clickable: false }];
    }
    const path = findPath(tree.roots, activeJourneyId);
    return [
      { id: MASTER_VIEW_ID, label: 'Master', clickable: true },
      ...path.map((n) => ({
        id: n.journeyId,
        label: n.label,
        clickable: n.journeyId !== activeJourneyId,
      })),
    ];
  }, [project, activeJourneyId]);

  const looping = journey?.formSchema.looping;

  const onExport = async () => {
    const blob = await exportProjectZip(project);
    downloadBlob(blob, `${project.applicationId || 'project'}.zip`);
  };

  const onImportZip = async (file: File) => {
    const next = await importProjectZip(file);
    loadProject(next);
  };

  const onImportFolder = async (files: FileList) => {
    const next = await importProjectFromFiles(Array.from(files));
    loadProject(next);
  };

  const onReset = () => {
    if (!confirm('Discard local changes and reload the bundled fixture?')) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* no-op */
    }
    loadProject(loadFixtureProject());
  };

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-sm font-semibold tracking-tight">TelePortal Builder</span>
        <span className="text-slate-400">·</span>
        <nav className="flex items-center gap-1 text-slate-600" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={`${c.id}-${i}`} className="flex items-center gap-1">
              {i > 0 ? <span className="text-slate-400">/</span> : null}
              {c.clickable ? (
                <button
                  type="button"
                  onClick={() => setActiveJourney(c.id)}
                  className="rounded px-1.5 py-0.5 hover:bg-slate-100"
                >
                  {c.label}
                </button>
              ) : (
                <span className="rounded px-1.5 py-0.5 font-medium text-slate-900">
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
        {looping ? (
          <span
            className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
            title={`Looping journey · parent: ${looping.parentJourneyId}`}
          >
            ↻ looping · parent {looping.parentJourneyId}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => folderRef.current?.click()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50"
          title="Import a schemas folder (drag-drop also works anywhere on the canvas)"
        >
          Import folder
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50"
          title="Import a .zip exported from this builder or the runtime app"
        >
          Import zip
        </button>
        <button
          type="button"
          onClick={onExport}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50"
        >
          Export zip
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50"
          title="Discard local changes and reload the bundled fixture"
        >
          Reset
        </button>
      </div>

      {/* Hidden file inputs for the picker buttons. */}
      <input
        ref={fileRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onImportZip(file);
          e.target.value = '';
        }}
      />
      <input
        ref={folderRef}
        type="file"
        // @ts-expect-error -- non-standard attribute supported by Chromium / Safari
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void onImportFolder(e.target.files);
          }
          e.target.value = '';
        }}
      />
    </header>
  );
}

function findPath(
  nodes: JourneyTreeNode[],
  targetId: string,
  acc: JourneyTreeNode[] = [],
): JourneyTreeNode[] {
  for (const n of nodes) {
    const next = [...acc, n];
    if (n.journeyId === targetId) return next;
    if (n.children.length > 0) {
      const found = findPath(n.children, targetId, next);
      if (found.length > 0) return found;
    }
  }
  return [];
}
