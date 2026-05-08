/**
 * Drag-drop import surface for the whole builder shell. Accepts:
 *   - a .zip file (JSZip-loaded)
 *   - one or more .json files (folder drag — uses webkitGetAsEntry to
 *     walk a directory tree)
 *
 * The canvas's React-Flow drop handler claims the `application/teleportal-builder`
 * mime type (palette-to-canvas adds), so this only intercepts native files.
 */

import { useEffect, useState, type ReactNode } from 'react';

import {
  importProjectFromFiles,
  importProjectZip,
} from '../persistence/import';
import { useBuilderStore } from '../store';

export function DropZone({ children }: { children: ReactNode }) {
  const loadProject = useBuilderStore((s) => s.loadProject);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let counter = 0;
    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter++;
      setActive(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      counter--;
      if (counter <= 0) {
        counter = 0;
        setActive(false);
      }
    };
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = async (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter = 0;
      setActive(false);
      const dt = e.dataTransfer;
      if (!dt) return;
      const fileList = await collectFiles(dt);
      if (fileList.length === 0) return;
      // ZIP shortcut.
      if (
        fileList.length === 1 &&
        (fileList[0]!.name.endsWith('.zip') || fileList[0]!.type === 'application/zip')
      ) {
        const next = await importProjectZip(fileList[0]!);
        loadProject(next);
        return;
      }
      const next = await importProjectFromFiles(fileList);
      loadProject(next);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [loadProject]);

  return (
    <div className="relative h-full">
      {children}
      {active ? (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30">
          <div className="rounded-lg border-2 border-dashed border-white bg-white/95 px-6 py-4 text-center text-slate-800 shadow-xl">
            <div className="text-base font-semibold">Drop to import</div>
            <div className="text-xs text-slate-500">
              ZIP, folder of <code>*-schema.json</code> files, or a single JSON
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function hasFiles(e: DragEvent): boolean {
  return !!e.dataTransfer?.types.includes('Files');
}

/**
 * Walk every dragged item, recursively reading folders via webkitGetAsEntry.
 * Falls back to flat file list when the directory APIs aren't available.
 */
async function collectFiles(dt: DataTransfer): Promise<File[]> {
  const out: File[] = [];
  const items = Array.from(dt.items ?? []);
  if (items.length === 0) {
    // Fallback: flat dt.files.
    if (dt.files) out.push(...Array.from(dt.files));
    return out;
  }
  await Promise.all(
    items.map(async (item) => {
      if (item.kind !== 'file') return;
      const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => unknown }).webkitGetAsEntry?.();
      if (entry) {
        await readEntry(entry as FileSystemEntry, out);
      } else {
        const file = item.getAsFile();
        if (file) out.push(file);
      }
    }),
  );
  return out;
}

interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
}
interface FileSystemFileEntry extends FileSystemEntry {
  isFile: true;
  file(success: (f: File) => void, error?: (e: unknown) => void): void;
}
interface FileSystemDirectoryEntry extends FileSystemEntry {
  isDirectory: true;
  createReader(): FileSystemDirectoryReader;
}
interface FileSystemDirectoryReader {
  readEntries(success: (entries: FileSystemEntry[]) => void, error?: (e: unknown) => void): void;
}

async function readEntry(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    const f = await getFileFromEntry(entry as FileSystemFileEntry);
    if (f) out.push(f);
    return;
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    let entries: FileSystemEntry[] = [];
    do {
      entries = await readEntriesBatch(reader);
      for (const child of entries) await readEntry(child, out);
    } while (entries.length > 0);
  }
}

function getFileFromEntry(entry: FileSystemFileEntry): Promise<File | null> {
  return new Promise((resolve) => {
    entry.file(
      (f) => {
        // Preserve the relative path so importer can reconstruct location.
        try {
          Object.defineProperty(f, 'webkitRelativePath', {
            value: entry.fullPath.replace(/^\//, ''),
          });
        } catch {
          /* ignore */
        }
        resolve(f);
      },
      () => resolve(null),
    );
  });
}

function readEntriesBatch(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve) => {
    reader.readEntries(
      (entries) => resolve(entries),
      () => resolve([]),
    );
  });
}
