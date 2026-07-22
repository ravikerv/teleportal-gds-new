/**
 * Top-level shell. Three columns + bottom drawer:
 *   ┌──────────┬───────────────────────────┬────────────┐
 *   │ Palette  │ Canvas / Master view      │ Inspector  │
 *   └──────────┴───────────────────────────┴────────────┘
 *   ┌──────────────────────────────────────────────────┐
 *   │ JSON / Preview / Validation drawer (collapsible) │
 *   └──────────────────────────────────────────────────┘
 *
 * Center swaps between the React Flow canvas (when a journey is active)
 * and the master-task-list view (sentinel `MASTER_VIEW_ID`).
 */

import { useEffect } from 'react';

import { Canvas } from './canvas/Canvas';
import { Inspector } from './inspector/Inspector';
import { MasterView } from './master/MasterView';
import { Palette } from './palette/Palette';
import { BottomDrawer } from './shell/BottomDrawer';
import { DropZone } from './shell/DropZone';
import { TopBar } from './shell/TopBar';
import {
  MASTER_VIEW_ID,
  redoProjectChange,
  undoProjectChange,
  useBuilderStore,
} from './store';

/**
 * Global undo/redo shortcuts: Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, Ctrl+Y. Skipped
 * while typing in a form control so the browser's native text-field undo
 * keeps working in the inspector.
 */
function useUndoRedoShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      const key = e.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (key === 'y' || e.shiftKey) redoProjectChange();
      else undoProjectChange();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

export function App() {
  const activeJourneyId = useBuilderStore((s) => s.activeJourneyId);
  const isMaster = activeJourneyId === MASTER_VIEW_ID;
  useUndoRedoShortcuts();
  return (
    <DropZone>
      <div className="flex h-full flex-col bg-slate-50 text-slate-800">
        <TopBar />
        <div className="flex flex-1 min-h-0">
          <aside className="w-64 border-r border-slate-200 bg-white">
            <Palette />
          </aside>
          <main className="flex flex-1 min-w-0 flex-col">
            <div className="flex-1 min-h-0">
              {isMaster ? <MasterView /> : <Canvas />}
            </div>
            <BottomDrawer />
          </main>
          <aside className="w-80 border-l border-slate-200 bg-white">
            <Inspector />
          </aside>
        </div>
      </div>
    </DropZone>
  );
}
