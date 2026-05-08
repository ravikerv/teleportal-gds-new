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

import { Canvas } from './canvas/Canvas';
import { Inspector } from './inspector/Inspector';
import { MasterTaskListView } from './master/MasterTaskListView';
import { Palette } from './palette/Palette';
import { BottomDrawer } from './shell/BottomDrawer';
import { DropZone } from './shell/DropZone';
import { TopBar } from './shell/TopBar';
import { MASTER_VIEW_ID, useBuilderStore } from './store';

export function App() {
  const activeJourneyId = useBuilderStore((s) => s.activeJourneyId);
  const isMaster = activeJourneyId === MASTER_VIEW_ID;
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
              {isMaster ? <MasterTaskListView /> : <Canvas />}
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
