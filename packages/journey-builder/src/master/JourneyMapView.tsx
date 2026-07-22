/**
 * Journey map — the whole-application overview. One canvas showing the
 * master task list, every journey, and how they stitch together:
 *
 *   - master task list → each referenced journey   (solid slate)
 *   - journey → journey via a sub-task-list page    (solid slate, "sub-task")
 *   - journey → its looping child                   (dashed amber, "looping")
 *   - journey → journey via `journey:` nav token    (violet, "links to")
 *   - journey → journey via `add-instance:` token   (dashed amber, "adds entry")
 *
 * Read-only by design: nodes drag locally for exploration (positions are
 * not persisted), nothing connects or deletes. Every journey card has an
 * Open button that dives into that journey's editing canvas. Layout is
 * dagre top-to-bottom, recomputed from the schema on every mutation.
 */

import dagre from '@dagrejs/dagre';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { useMemo } from 'react';

import type { FormPage, TaskListJourneyPage } from '../schema';
import { useBuilderStore, type Project } from '../store';
import { listJourneyRefs, titleOf } from '../store/tree';
import { validateProject } from '../validation/checks';

const MASTER_ID = '__map:master__';

type MapNodeData =
  | {
      kind: 'master';
      title: string;
      taskCount: number;
      sectionCount: number;
    }
  | {
      kind: 'journey';
      journeyId: string;
      label: string;
      exists: boolean;
      isLooping: boolean;
      formCount: number;
      hasHub: boolean;
      hasTaskList: boolean;
      hasSummary: boolean;
      errors: number;
      warnings: number;
    };

type MapNode = Node<MapNodeData, 'master' | 'journey'>;
type MapEdge = Edge;

// ---------------------------------------------------------------------------
// Graph derivation
// ---------------------------------------------------------------------------

type EdgeKind = 'master-ref' | 'sub-task' | 'looping' | 'nav-link' | 'add-instance';

const EDGE_STYLE: Record<
  EdgeKind,
  { color: string; dash?: string; label?: string }
> = {
  'master-ref': { color: '#64748b' },
  'sub-task': { color: '#64748b', label: 'sub-task' },
  looping: { color: '#d97706', dash: '6 3', label: 'looping' },
  'nav-link': { color: '#7c3aed', label: 'links to' },
  'add-instance': { color: '#d97706', dash: '6 3', label: 'adds entry' },
};

function projectToJourneyMap(project: Project): {
  nodes: MapNode[];
  edges: MapEdge[];
} {
  const nodes: MapNode[] = [];
  const edgeSet = new Map<string, MapEdge>();
  const journeyIds = new Set(Object.keys(project.journeys));
  const referenced = new Set<string>();

  const issues = validateProject(project);

  const pushEdge = (source: string, target: string, kind: EdgeKind) => {
    const id = `${source}=>${target}:${kind}`;
    if (edgeSet.has(id)) return;
    const style = EDGE_STYLE[kind];
    edgeSet.set(id, {
      id,
      source,
      target,
      type: 'smoothstep',
      style: {
        stroke: style.color,
        strokeWidth: 1.5,
        ...(style.dash ? { strokeDasharray: style.dash } : {}),
      },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: style.color },
      ...(style.label
        ? {
            label: style.label,
            labelStyle: { fill: '#475569', fontSize: 10, fontWeight: 500 },
            labelBgStyle: { fill: '#f8fafc', stroke: '#e2e8f0', strokeWidth: 1 },
            labelBgPadding: [5, 2] as [number, number],
            labelBgBorderRadius: 3,
          }
        : {}),
    });
  };

  const ensureJourneyNode = (jid: string) => {
    referenced.add(jid);
  };

  // Master node + master → journey edges.
  const masterTasks = listJourneyRefs(project.taskList);
  nodes.push({
    id: MASTER_ID,
    type: 'master',
    position: { x: 0, y: 0 },
    data: {
      kind: 'master',
      title: project.taskList.title || '(untitled application)',
      taskCount: masterTasks.length,
      sectionCount: project.taskList.sections?.length ?? 0,
    },
  });
  for (const jid of masterTasks) {
    ensureJourneyNode(jid);
    pushEdge(MASTER_ID, jid, 'master-ref');
  }

  // Journey-to-journey edges.
  for (const [jid, journey] of Object.entries(project.journeys)) {
    ensureJourneyNode(jid);

    // Sub-task-list pages reference child journeys.
    const tlPage = journey.formSchema.forms.find(
      (p): p is TaskListJourneyPage => p.type === 'task-list',
    );
    if (tlPage) {
      for (const ref of listJourneyRefs(tlPage)) {
        ensureJourneyNode(ref);
        pushEdge(jid, ref, 'sub-task');
      }
    }

    // Looping children hang off their parent.
    const looping = journey.formSchema.looping;
    if (looping) {
      ensureJourneyNode(looping.parentJourneyId);
      pushEdge(looping.parentJourneyId, jid, 'looping');
    }

    // Cross-journey navigation tokens in next / nextWhen / summary.next.
    const tokens: string[] = [];
    for (const p of journey.formSchema.forms) {
      if (p.type === undefined || p.type === 'form') {
        const form = p as FormPage;
        tokens.push(form.next, ...(form.nextWhen ?? []).map((r) => r.then));
      }
    }
    if (journey.summarySchema) tokens.push(journey.summarySchema.next);
    for (const token of tokens) {
      if (!token) continue;
      if (token.startsWith('journey:')) {
        const target = token.slice('journey:'.length);
        ensureJourneyNode(target);
        pushEdge(jid, target, 'nav-link');
      } else if (token.startsWith('add-instance:')) {
        const target = token.slice('add-instance:'.length);
        ensureJourneyNode(target);
        pushEdge(jid, target, 'add-instance');
      }
    }
  }

  // Journey nodes — including dangling references and orphans.
  for (const jid of new Set([...referenced, ...journeyIds])) {
    const journey = project.journeys[jid];
    const jIssues = issues.filter((i) => i.journeyId === jid);
    nodes.push({
      id: jid,
      type: 'journey',
      position: { x: 0, y: 0 },
      data: {
        kind: 'journey',
        journeyId: jid,
        label: titleOf(project, jid),
        exists: !!journey,
        isLooping: !!journey?.formSchema.looping,
        formCount:
          journey?.formSchema.forms.filter(
            (p) => p.type === undefined || p.type === 'form',
          ).length ?? 0,
        hasHub: !!journey?.formSchema.forms.some((p) => p.type === 'hub'),
        hasTaskList: !!journey?.formSchema.forms.some((p) => p.type === 'task-list'),
        hasSummary: !!journey?.summarySchema,
        errors: jIssues.filter((i) => i.severity === 'error').length,
        warnings: jIssues.filter((i) => i.severity === 'warning').length,
      },
    });
  }

  return { nodes: layoutTopDown(nodes, [...edgeSet.values()]), edges: [...edgeSet.values()] };
}

function layoutTopDown(nodes: MapNode[], edges: MapEdge[]): MapNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 56, ranksep: 88, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  const WIDTH = 240;
  const HEIGHT = 110;
  for (const n of nodes) g.setNode(n.id, { width: WIDTH, height: HEIGHT });
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  return nodes.map((n) => {
    const placed = g.node(n.id);
    return placed
      ? {
          ...n,
          position: {
            x: Math.round(placed.x - WIDTH / 2),
            y: Math.round(placed.y - HEIGHT / 2),
          },
        }
      : n;
  });
}

// ---------------------------------------------------------------------------
// Node renderers
// ---------------------------------------------------------------------------

function MasterMapNode(props: NodeProps<MapNode>) {
  if (props.data.kind !== 'master') return null;
  const { title, taskCount, sectionCount } = props.data;
  return (
    <div className="w-[240px] rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-white shadow-md">
      <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-200">
        master task list
      </span>
      <div className="mt-1.5 text-sm font-semibold leading-snug">{title}</div>
      <div className="mt-1 text-[11px] text-slate-400">
        {taskCount} task{taskCount === 1 ? '' : 's'}
        {sectionCount > 0 ? ` · ${sectionCount} section${sectionCount === 1 ? '' : 's'}` : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
    </div>
  );
}

function JourneyMapNode(props: NodeProps<MapNode>) {
  const setActiveJourney = useBuilderStore((s) => s.setActiveJourney);
  if (props.data.kind !== 'journey') return null;
  const d = props.data;
  const parts: string[] = [];
  if (d.hasHub) parts.push('hub');
  if (d.hasTaskList) parts.push('task list');
  parts.push(`${d.formCount} form${d.formCount === 1 ? '' : 's'}`);
  if (d.hasSummary) parts.push('summary');
  return (
    <div
      className={`w-[240px] rounded-lg border border-l-4 bg-white px-4 py-3 text-xs shadow-sm ${
        d.exists ? 'border-slate-200 border-l-blue-500' : 'border-dashed border-slate-300 border-l-slate-300 bg-slate-50'
      } ${props.selected ? 'ring-2 ring-blue-500' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div className="flex items-center gap-1.5">
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-700">
          journey
        </span>
        {d.isLooping ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
            ↻ loop
          </span>
        ) : null}
        {!d.exists ? (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
            missing
          </span>
        ) : null}
        {d.errors > 0 ? (
          <span
            className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white"
            role="img"
            aria-label={`${d.errors} validation error${d.errors === 1 ? '' : 's'}`}
            title={`${d.errors} validation error${d.errors === 1 ? '' : 's'}`}
          >
            !{d.errors > 1 ? d.errors : null}
          </span>
        ) : d.warnings > 0 ? (
          <span
            className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-amber-400 px-1 py-0.5 text-[10px] font-bold leading-none text-amber-950"
            role="img"
            aria-label={`${d.warnings} warning${d.warnings === 1 ? '' : 's'}`}
            title={`${d.warnings} warning${d.warnings === 1 ? '' : 's'}`}
          >
            ?{d.warnings > 1 ? d.warnings : null}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 text-sm font-medium leading-snug text-slate-800">{d.label}</div>
      <div className="mt-0.5 break-all text-[11px] text-slate-400">{d.journeyId}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">
          {d.exists ? parts.join(' · ') : 'referenced but not built yet'}
        </span>
        {d.exists ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveJourney(d.journeyId);
            }}
            className="shrink-0 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-slate-700"
          >
            Open →
          </button>
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
}

const mapNodeTypes = { master: MasterMapNode, journey: JourneyMapNode };

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function JourneyMapView() {
  const project = useBuilderStore((s) => s.project);
  const { nodes, edges } = useMemo(() => projectToJourneyMap(project), [project]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={mapNodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        nodesConnectable={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable />
        <Panel position="bottom-right">
          <div className="rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-600 shadow-sm">
            <div className="mb-1 font-semibold text-slate-700">Connections</div>
            <LegendRow color="#64748b" label="task list reference" />
            <LegendRow color="#d97706" dashed label="looping / adds entry" />
            <LegendRow color="#7c3aed" label="cross-journey link" />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

function LegendRow({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <svg width="24" height="6" aria-hidden="true">
        <line
          x1="0"
          y1="3"
          x2="24"
          y2="3"
          stroke={color}
          strokeWidth="2"
          {...(dashed ? { strokeDasharray: '5 3' } : {})}
        />
      </svg>
      <span>{label}</span>
    </div>
  );
}
