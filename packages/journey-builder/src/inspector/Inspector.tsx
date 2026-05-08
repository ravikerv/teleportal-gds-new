/**
 * Right-rail inspector. Dispatches to the type-specific editor for the
 * selected node. Each editor calls store actions to mutate the schema;
 * the canvas re-renders via the store subscription.
 */

import { useMemo } from 'react';

import {
  EXTERNAL_NODE_PREFIX,
  HUB_NODE_PREFIX,
  SUMMARY_NODE_ID,
  TASKLIST_NODE_PREFIX,
  type FormPage,
  type HubPage,
  type TaskListJourneyPage,
} from '../schema';
import { selectActiveJourney, useBuilderStore } from '../store';
import { EdgeInspector } from './EdgeInspector';
import { FormEditor } from './FormEditor';
import { HubEditor } from './HubEditor';
import { SummaryEditor } from './SummaryEditor';
import { TaskListEditor } from './TaskListEditor';

type Selected =
  | { kind: 'form'; page: FormPage }
  | { kind: 'hub'; page: HubPage }
  | { kind: 'task-list'; page: TaskListJourneyPage }
  | { kind: 'summary' }
  | { kind: 'external'; token: string };

export function Inspector() {
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);
  const selectedEdgeId = useBuilderStore((s) => s.selectedEdgeId);
  const journeyId = useBuilderStore((s) => s.activeJourneyId);
  const journey = useBuilderStore(selectActiveJourney);

  const selected = useMemo<Selected | null>(() => {
    if (!selectedNodeId || !journey) return null;
    if (selectedNodeId === SUMMARY_NODE_ID) {
      return journey.summarySchema ? { kind: 'summary' } : null;
    }
    if (selectedNodeId.startsWith(EXTERNAL_NODE_PREFIX)) {
      return {
        kind: 'external',
        token: selectedNodeId.slice(EXTERNAL_NODE_PREFIX.length),
      };
    }
    if (selectedNodeId.startsWith(HUB_NODE_PREFIX)) {
      const id = selectedNodeId.slice(HUB_NODE_PREFIX.length);
      const page = journey.formSchema.forms.find(
        (p): p is HubPage => p.type === 'hub' && p.id === id,
      );
      return page ? { kind: 'hub', page } : null;
    }
    if (selectedNodeId.startsWith(TASKLIST_NODE_PREFIX)) {
      const id = selectedNodeId.slice(TASKLIST_NODE_PREFIX.length);
      const page = journey.formSchema.forms.find(
        (p): p is TaskListJourneyPage => p.type === 'task-list' && p.id === id,
      );
      return page ? { kind: 'task-list', page } : null;
    }
    const page = journey.formSchema.forms.find(
      (p): p is FormPage =>
        (p.type === undefined || p.type === 'form') &&
        (p as { formId: string }).formId === selectedNodeId,
    );
    return page ? { kind: 'form', page } : null;
  }, [selectedNodeId, journey]);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto bg-slate-50 p-3 text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Inspector
      </h2>
      {selectedEdgeId ? (
        <EdgeInspector />
      ) : !selected ? (
        <div className="rounded border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-500">
          Select a node, an edge, or drag a page from the palette onto the canvas.
        </div>
      ) : selected.kind === 'form' ? (
        <FormEditor journeyId={journeyId} page={selected.page} />
      ) : selected.kind === 'hub' ? (
        <HubEditor journeyId={journeyId} page={selected.page} />
      ) : selected.kind === 'task-list' ? (
        <TaskListEditor journeyId={journeyId} page={selected.page} />
      ) : selected.kind === 'summary' && journey?.summarySchema ? (
        <SummaryEditor journeyId={journeyId} schema={journey.summarySchema} />
      ) : selected.kind === 'external' ? (
        <ExternalView token={selected.token} />
      ) : null}
    </div>
  );
}

function ExternalView({ token }: { token: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3 text-xs">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        External target
      </div>
      <div className="mt-1 break-all font-mono text-slate-700">{token}</div>
      <p className="mt-2 text-slate-500">
        Tokens like <code>task-list</code>, <code>journey:foo</code>,
        <code> add-instance:foo</code>, <code>parent-summary</code> aren't
        editable here — change the source page's <code>next</code> to
        retarget.
      </p>
    </div>
  );
}
