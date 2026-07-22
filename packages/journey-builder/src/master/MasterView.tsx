/**
 * Master surface with two tabs:
 *   - Journey map (default) — the whole-application visual overview.
 *   - Task list editor — the existing sections/tasks/footer editor.
 * The map is the orientation surface; editing details lives one tab over.
 */

import { useState } from 'react';

import { JourneyMapView } from './JourneyMapView';
import { MasterTaskListView } from './MasterTaskListView';

type Tab = 'map' | 'editor';

export function MasterView() {
  const [tab, setTab] = useState<Tab>('map');
  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 py-1.5"
        role="tablist"
        aria-label="Master view"
      >
        <TabButton active={tab === 'map'} onClick={() => setTab('map')}>
          Journey map
        </TabButton>
        <TabButton active={tab === 'editor'} onClick={() => setTab('editor')}>
          Task list editor
        </TabButton>
      </div>
      <div className="min-h-0 flex-1">
        {tab === 'map' ? <JourneyMapView /> : <MasterTaskListView />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-sm ${
        active
          ? 'bg-slate-900 font-medium text-white'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}
