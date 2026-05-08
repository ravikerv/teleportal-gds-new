/**
 * JSON / Preview / Validation tabs.
 *
 *   - JSON: live re-export of the active journey via the round-tripper.
 *           "round-trip ok" badge confirms layout edits don't leak into
 *           the schema.
 *   - Preview: GovUK-styled static preview of the selected node, with a
 *             mock-data textarea on the right for driving conditional
 *             reveals + summary entries (M6).
 *   - Validation: project-wide cross-reference checks, click an issue to
 *                 jump to the journey + select the offending node (M6).
 */

import { useMemo, useState } from 'react';

import { PreviewPane } from '../preview/PreviewPane';
import { roundTripSchemas, selectActiveJourney, useBuilderStore } from '../store';
import { ValidationPanel } from '../validation/ValidationPanel';
import { validateProject } from '../validation/checks';

type Tab = 'json' | 'preview' | 'validation';

export function BottomDrawer() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>('json');

  const activeJourneyId = useBuilderStore((s) => s.activeJourneyId);
  const activeJourney = useBuilderStore(selectActiveJourney);
  const project = useBuilderStore((s) => s.project);

  const exported = useMemo(
    () => (activeJourney ? roundTripSchemas(activeJourneyId, activeJourney) : null),
    [activeJourneyId, activeJourney],
  );
  const sourceFormJson = useMemo(
    () => (activeJourney ? JSON.stringify(activeJourney.formSchema, null, 2) : ''),
    [activeJourney],
  );
  const exportedFormJson = useMemo(
    () => (exported ? JSON.stringify(exported.formSchema, null, 2) : ''),
    [exported],
  );
  const drift = sourceFormJson !== exportedFormJson;

  const issues = useMemo(() => validateProject(project), [project]);
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded px-2 py-0.5 text-slate-700 hover:bg-slate-100"
          aria-expanded={open}
        >
          {open ? '▾' : '▸'}
        </button>
        <TabButton active={tab === 'json' && open} onClick={() => { setTab('json'); setOpen(true); }}>
          JSON
        </TabButton>
        <TabButton active={tab === 'preview' && open} onClick={() => { setTab('preview'); setOpen(true); }}>
          Preview
        </TabButton>
        <TabButton active={tab === 'validation' && open} onClick={() => { setTab('validation'); setOpen(true); }}>
          Validation
          {errorCount > 0 ? (
            <span className="ml-1 rounded bg-red-200 px-1 text-[10px] font-medium text-red-800">
              {errorCount}
            </span>
          ) : null}
          {warningCount > 0 ? (
            <span className="ml-1 rounded bg-amber-200 px-1 text-[10px] font-medium text-amber-800">
              {warningCount}
            </span>
          ) : null}
        </TabButton>
        <span className="ml-auto text-[11px]">
          {tab === 'json' && exported ? (
            drift ? (
              <span className="text-amber-700">round-trip drift detected</span>
            ) : (
              <span className="text-emerald-700">round-trip ok</span>
            )
          ) : null}
        </span>
      </div>
      {open ? (
        <div className="h-72 overflow-hidden border-t border-slate-200 bg-slate-50 p-3">
          {tab === 'json' ? (
            <div className="h-full overflow-y-auto font-mono text-xs text-slate-700">
              {exported ? (
                <pre>
                  {exportedFormJson}
                  {exported.summarySchema
                    ? `\n\n// summary-schema.json\n${JSON.stringify(exported.summarySchema, null, 2)}`
                    : ''}
                </pre>
              ) : (
                <span className="text-slate-400">No active journey.</span>
              )}
            </div>
          ) : tab === 'preview' ? (
            <PreviewPane />
          ) : (
            <ValidationPanel />
          )}
        </div>
      ) : null}
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
      onClick={onClick}
      className={`rounded px-2 py-0.5 capitalize ${
        active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}
