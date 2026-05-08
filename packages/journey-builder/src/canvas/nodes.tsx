/**
 * Custom React Flow node renderers per JourneyPage variant. Each shows
 * the page kind as a header chip plus the title/id and a brief summary
 * of contents (field count, item count, etc.). Inspector handles editing
 * — these stay read-only on the canvas itself.
 */

import { Handle, Position, type NodeProps } from '@xyflow/react';

import type { BuilderNode } from '../schema';
import { MASTER_VIEW_ID, selectActiveJourney, useBuilderStore } from '../store';

const BASE =
  'rounded-md border bg-white px-3 py-2 text-xs shadow-sm min-w-[160px]';

export function FormNode(props: NodeProps<BuilderNode>) {
  if (props.data.kind !== 'form') return null;
  const { page } = props.data;
  return (
    <div
      className={`${BASE} border-slate-300 ${
        props.selected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-700">
          form
        </span>
        <span className="font-medium text-slate-700">{page.formId}</span>
      </div>
      <div className="mt-1 text-slate-500">{page.title}</div>
      <div className="mt-1 text-[11px] text-slate-400">
        {page.fields.length} field{page.fields.length === 1 ? '' : 's'}
        {page.nextWhen ? ` · ${page.nextWhen.length} branch${page.nextWhen.length === 1 ? '' : 'es'}` : null}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function HubNode(props: NodeProps<BuilderNode>) {
  if (props.data.kind !== 'hub') return null;
  const { page } = props.data;
  return (
    <div
      className={`${BASE} border-emerald-300 bg-emerald-50 ${
        props.selected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800">
          hub
        </span>
        <span className="font-medium text-slate-700">{page.id}</span>
      </div>
      <div className="mt-1 text-slate-600">{page.title}</div>
      <div className="mt-1 text-[11px] text-slate-500">
        {page.items.length} row{page.items.length === 1 ? '' : 's'}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function TaskListNode(props: NodeProps<BuilderNode>) {
  if (props.data.kind !== 'task-list') return null;
  const { page } = props.data;
  const taskCount = page.tasks?.length ?? page.sections?.reduce((n, s) => n + s.tasks.length, 0) ?? 0;
  return (
    <div
      className={`${BASE} border-amber-300 bg-amber-50 ${
        props.selected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
          task list
        </span>
        <span className="font-medium text-slate-700">{page.id}</span>
      </div>
      <div className="mt-1 text-slate-600">{page.title}</div>
      <div className="mt-1 text-[11px] text-slate-500">
        {taskCount} task{taskCount === 1 ? '' : 's'}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function SummaryNode(props: NodeProps<BuilderNode>) {
  if (props.data.kind !== 'summary') return null;
  const { page } = props.data;
  return (
    <div
      className={`${BASE} border-violet-300 bg-violet-50 ${
        props.selected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-violet-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-800">
          summary
        </span>
        <span className="font-medium text-slate-700">summary</span>
      </div>
      <div className="mt-1 text-slate-600">{page.title}</div>
      <div className="mt-1 text-[11px] text-slate-500">
        {(page.headerRows?.length ?? 0)} header
        {page.entries ? ' · entries block' : null}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function ExternalNode(props: NodeProps<BuilderNode>) {
  if (props.data.kind !== 'external') return null;
  const { token } = props.data;
  const setActiveJourney = useBuilderStore((s) => s.setActiveJourney);
  const journey = useBuilderStore(selectActiveJourney);
  const journeys = useBuilderStore((s) => s.project.journeys);

  // Resolve which journey this token jumps to, if any. We don't navigate
  // for self-referential or non-journey tokens (`journey-root` is the
  // current journey's hub; that's a no-op here).
  const target = resolveJumpTarget(token, journey?.formSchema.looping?.parentJourneyId);
  const canJump =
    !!target && (target === MASTER_VIEW_ID || target in journeys);

  return (
    <div
      className={`${BASE} border-dashed border-slate-300 bg-slate-50 italic text-slate-500 ${
        props.selected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1.5 not-italic">
        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
          external
        </span>
      </div>
      <div className="mt-1 break-all">{token}</div>
      {canJump && target ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveJourney(target);
          }}
          className="mt-1.5 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-medium not-italic text-white hover:bg-slate-700"
        >
          open →
        </button>
      ) : null}
    </div>
  );
}

/**
 * Map a cross-journey nav token to the journey/master id we should switch
 * to when the user clicks "open" on the external node. Returns null when
 * the token has no journey-level destination (e.g. `journey-root`, which
 * is the current journey's hub, or a known formId).
 */
function resolveJumpTarget(
  token: string,
  parentJourneyIdForLoop: string | undefined,
): string | null {
  if (token === 'task-list') return MASTER_VIEW_ID;
  if (token === 'parent-summary') return parentJourneyIdForLoop ?? null;
  if (token === 'journey-root') return null; // already on this journey
  if (token.startsWith('journey:')) return token.slice('journey:'.length);
  if (token.startsWith('add-instance:')) return token.slice('add-instance:'.length);
  return null;
}

export const nodeTypes = {
  form: FormNode,
  hub: HubNode,
  'task-list': TaskListNode,
  summary: SummaryNode,
  external: ExternalNode,
};
