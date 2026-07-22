/**
 * Custom React Flow node renderers per JourneyPage variant.
 *
 * All five variants render through NodeShell: an icon + kind chip header,
 * the page id, title, a meta line, and (when the project has validation
 * issues touching this node) an error/warning badge. A NodeToolbar on the
 * selected node offers Duplicate (forms only) and Delete. Inspector still
 * owns editing — nodes stay read-only surfaces.
 *
 * Validation badges come from NodeIssuesContext, computed once per project
 * mutation in Canvas (never per-node) and keyed by node id.
 */

import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import { createContext, useContext, type ReactNode } from 'react';

import type { BuilderNode } from '../schema';
import { MASTER_VIEW_ID, selectActiveJourney, useBuilderStore } from '../store';

// ---------------------------------------------------------------------------
// Validation issues context (provided by Canvas)
// ---------------------------------------------------------------------------

export type NodeIssueCounts = { errors: number; warnings: number };
export const NodeIssuesContext = createContext<Map<string, NodeIssueCounts>>(
  new Map(),
);

// ---------------------------------------------------------------------------
// Icons (14px, stroke, inherit currentColor)
// ---------------------------------------------------------------------------

function icon(path: ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

const ICONS = {
  form: icon(
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>,
  ),
  hub: icon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
    </>,
  ),
  'task-list': icon(
    <>
      <path d="M4 6l2 2 3-3M4 13l2 2 3-3M4 20l2 2 3-3" transform="translate(0 -1.5)" />
      <path d="M12 6h8M12 12.5h8M12 19h8" />
    </>,
  ),
  summary: icon(
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2h6v4H9zM9 12l2 2 4-4" />
    </>,
  ),
  external: icon(
    <>
      <path d="M14 5h5v5" />
      <path d="M19 5l-8 8" />
      <path d="M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>,
  ),
} as const;

// ---------------------------------------------------------------------------
// Shared shell
// ---------------------------------------------------------------------------

type Accent = {
  /** Left accent + chip colors. Full literal class strings (Tailwind JIT). */
  border: string;
  chip: string;
  iconColor: string;
};

const ACCENTS: Record<keyof typeof ICONS, Accent> = {
  form: {
    border: 'border-l-blue-500',
    chip: 'bg-blue-100 text-blue-700',
    iconColor: 'text-blue-600',
  },
  hub: {
    border: 'border-l-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800',
    iconColor: 'text-emerald-600',
  },
  'task-list': {
    border: 'border-l-amber-500',
    chip: 'bg-amber-100 text-amber-800',
    iconColor: 'text-amber-600',
  },
  summary: {
    border: 'border-l-violet-500',
    chip: 'bg-violet-100 text-violet-800',
    iconColor: 'text-violet-600',
  },
  external: {
    border: 'border-l-slate-400',
    chip: 'bg-slate-200 text-slate-600',
    iconColor: 'text-slate-500',
  },
};

const HANDLE_CLASS =
  '!h-2.5 !w-2.5 !rounded-full !border-2 !border-white !bg-slate-400';

function IssueBadge({ nodeId }: { nodeId: string }) {
  const counts = useContext(NodeIssuesContext).get(nodeId);
  if (!counts || (counts.errors === 0 && counts.warnings === 0)) return null;
  const isError = counts.errors > 0;
  const total = isError ? counts.errors : counts.warnings;
  const description = isError
    ? `${counts.errors} validation error${counts.errors === 1 ? '' : 's'} — see the Validation drawer`
    : `${counts.warnings} warning${counts.warnings === 1 ? '' : 's'} — see the Validation drawer`;
  return (
    <span
      className={`ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-bold leading-none ${
        isError ? 'bg-red-600 text-white' : 'bg-amber-400 text-amber-950'
      }`}
      title={description}
      role="img"
      aria-label={description}
    >
      {isError ? '!' : '?'}
      {total > 1 ? total : null}
    </span>
  );
}

function NodeShell(props: {
  nodeId: string;
  selected: boolean;
  kind: keyof typeof ICONS;
  chipLabel: string;
  idLabel: ReactNode;
  title?: ReactNode;
  meta?: ReactNode;
  canDuplicate?: boolean;
  canDelete?: boolean;
  extra?: ReactNode;
  dashed?: boolean;
}) {
  const accent = ACCENTS[props.kind];
  const activeJourneyId = useBuilderStore((s) => s.activeJourneyId);
  const duplicatePage = useBuilderStore((s) => s.duplicatePage);
  const removePageByNodeId = useBuilderStore((s) => s.removePageByNodeId);
  const setSelectedNode = useBuilderStore((s) => s.setSelectedNode);

  return (
    <div
      className={`min-w-[180px] max-w-[230px] rounded-lg border border-l-4 bg-white px-3 py-2 text-xs shadow-sm transition-shadow ${
        accent.border
      } ${props.dashed ? 'border-dashed bg-slate-50' : 'border-slate-200'} ${
        props.selected ? 'shadow-md ring-2 ring-blue-500 ring-offset-1' : 'hover:shadow-md'
      }`}
    >
      <NodeToolbar isVisible={props.selected} position={Position.Top} offset={8}>
        <div className="flex gap-1 rounded-md border border-slate-200 bg-white p-0.5 shadow-md">
          {props.canDuplicate ? (
            <button
              type="button"
              onClick={() => {
                if (!activeJourneyId) return;
                const id = duplicatePage(activeJourneyId, props.nodeId);
                if (id) setSelectedNode(id);
              }}
              className="rounded px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
            >
              Duplicate
            </button>
          ) : null}
          {props.canDelete ? (
            <button
              type="button"
              onClick={() => {
                if (!activeJourneyId) return;
                removePageByNodeId(activeJourneyId, props.nodeId);
                setSelectedNode(null);
              }}
              className="rounded px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          ) : null}
        </div>
      </NodeToolbar>

      <Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
      <div className="flex items-center gap-1.5">
        <span className={accent.iconColor}>{ICONS[props.kind]}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${accent.chip}`}
        >
          {props.chipLabel}
        </span>
        <IssueBadge nodeId={props.nodeId} />
      </div>
      <div className="mt-1.5 font-medium text-slate-700">{props.idLabel}</div>
      {props.title ? <div className="mt-0.5 text-slate-500">{props.title}</div> : null}
      {props.meta ? (
        <div className="mt-1 text-[11px] text-slate-400">{props.meta}</div>
      ) : null}
      {props.extra}
      <Handle type="source" position={Position.Right} className={HANDLE_CLASS} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-variant nodes
// ---------------------------------------------------------------------------

export function FormNode(props: NodeProps<BuilderNode>) {
  if (props.data.kind !== 'form') return null;
  const { page } = props.data;
  return (
    <NodeShell
      nodeId={props.id}
      selected={props.selected ?? false}
      kind="form"
      chipLabel="form"
      idLabel={page.formId}
      title={page.title}
      meta={
        <>
          {page.fields.length} field{page.fields.length === 1 ? '' : 's'}
          {page.nextWhen
            ? ` · ${page.nextWhen.length} branch${page.nextWhen.length === 1 ? '' : 'es'}`
            : null}
        </>
      }
      canDuplicate
      canDelete
    />
  );
}

export function HubNode(props: NodeProps<BuilderNode>) {
  if (props.data.kind !== 'hub') return null;
  const { page } = props.data;
  return (
    <NodeShell
      nodeId={props.id}
      selected={props.selected ?? false}
      kind="hub"
      chipLabel="hub"
      idLabel={page.id}
      title={page.title}
      meta={`${page.items.length} row${page.items.length === 1 ? '' : 's'}`}
      canDelete
    />
  );
}

export function TaskListNode(props: NodeProps<BuilderNode>) {
  if (props.data.kind !== 'task-list') return null;
  const { page } = props.data;
  const taskCount =
    page.tasks?.length ??
    page.sections?.reduce((n, s) => n + s.tasks.length, 0) ??
    0;
  return (
    <NodeShell
      nodeId={props.id}
      selected={props.selected ?? false}
      kind="task-list"
      chipLabel="task list"
      idLabel={page.id}
      title={page.title}
      meta={`${taskCount} task${taskCount === 1 ? '' : 's'}`}
      canDelete
    />
  );
}

export function SummaryNode(props: NodeProps<BuilderNode>) {
  if (props.data.kind !== 'summary') return null;
  const { page } = props.data;
  return (
    <NodeShell
      nodeId={props.id}
      selected={props.selected ?? false}
      kind="summary"
      chipLabel="summary"
      idLabel="Check your answers"
      title={page.title}
      meta={
        <>
          {page.headerRows?.length ?? 0} header
          {page.entries ? ' · entries block' : null}
        </>
      }
      canDelete
    />
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
  const canJump = !!target && (target === MASTER_VIEW_ID || target in journeys);

  return (
    <NodeShell
      nodeId={props.id}
      selected={props.selected ?? false}
      kind="external"
      chipLabel="external"
      idLabel={<span className="break-all font-normal italic text-slate-500">{token}</span>}
      dashed
      extra={
        canJump && target ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveJourney(target);
            }}
            className="mt-1.5 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-slate-700"
          >
            open →
          </button>
        ) : null
      }
    />
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
