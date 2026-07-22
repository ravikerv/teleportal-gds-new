/**
 * Bidirectional schema ↔ canvas mapping.
 *
 *   schema (FormSchema + optional SummarySchema)
 *      │
 *      │  schemaToCanvas       canvasToSchema
 *      ▼                              ▲
 *   { nodes, edges }                  │
 *      │                              │
 *      └──────  React Flow  ──────────┘
 *
 * Schema is the source of truth. Canvas state is purely derived; the only
 * canvas-side authority is **layout** (node positions), which is stored as
 * a side-car keyed by node id and never round-trips through the schema.
 *
 * Edges encode `next` (default, no `data.condition`) and each `nextWhen`
 * rule (one edge per rule, with `data.condition = { fieldId, value }`).
 *
 * Cross-journey targets (`task-list`, `journey:foo`, `add-instance:foo`,
 * `parent-summary`, `summary` pointing to this journey's summary, etc.)
 * become **external** placeholder nodes. They round-trip cleanly: the
 * mapper detects them from edge targets and re-emits the right token.
 */

import { MarkerType, type Edge, type Node } from '@xyflow/react';
import type {
  FormPage,
  FormSchema,
  HubPage,
  JourneyPage,
  NextWhenRule,
  SummarySchema,
  TaskListJourneyPage,
} from 'teleportal-gds';

// ---------------------------------------------------------------------------
// Node + edge data shapes (custom, narrowed to what we need)
// ---------------------------------------------------------------------------

export type BuilderNodeKind = 'form' | 'hub' | 'task-list' | 'summary' | 'external';

export type BuilderNodeData =
  | { kind: 'form'; page: FormPage }
  | { kind: 'hub'; page: HubPage }
  | { kind: 'task-list'; page: TaskListJourneyPage }
  | { kind: 'summary'; page: SummarySchema }
  | { kind: 'external'; token: string };

export type BuilderNode = Node<BuilderNodeData, BuilderNodeKind>;

export type BuilderEdgeData = {
  /** Conditional `nextWhen` rule, or undefined for the default `next`. */
  condition?: { fieldId: string; value: string };
};

export type BuilderEdge = Edge<BuilderEdgeData>;

export type LayoutMap = Record<string, { x: number; y: number }>;

// Fixed node ids reserved for engine concepts. Keeps target resolution
// trivial: any edge target starting with `__` is an external/synthetic.
export const SUMMARY_NODE_ID = '__summary';
export const HUB_NODE_PREFIX = '__hub:';
export const TASKLIST_NODE_PREFIX = '__tasklist:';
export const EXTERNAL_NODE_PREFIX = '__ext:';

// ---------------------------------------------------------------------------
// schemaToCanvas
// ---------------------------------------------------------------------------

export function schemaToCanvas(input: {
  formSchema: FormSchema;
  summarySchema?: SummarySchema;
  layout?: LayoutMap;
}): { nodes: BuilderNode[]; edges: BuilderEdge[] } {
  const { formSchema, summarySchema, layout = {} } = input;

  const nodes: BuilderNode[] = [];
  const edges: BuilderEdge[] = [];
  const externalNodeIds = new Set<string>();

  // 1. Page nodes (forms / hub / task-list)
  formSchema.forms.forEach((page, idx) => {
    const id = pageNodeId(page);
    const pos = layout[id] ?? defaultPosition(page, idx);
    nodes.push({
      id,
      type: kindOf(page),
      position: pos,
      data: pageData(page),
    });
  });

  // 2. Summary node (separate file, but rendered on the same canvas)
  if (summarySchema) {
    const pos = layout[SUMMARY_NODE_ID] ?? { x: 600, y: 80 };
    nodes.push({
      id: SUMMARY_NODE_ID,
      type: 'summary',
      position: pos,
      data: { kind: 'summary', page: summarySchema },
    });
  }

  // 3. Edges from each form's `next` and `nextWhen[]`
  for (const page of formSchema.forms) {
    if (!isFormPage(page)) continue;

    pushEdge({
      from: page.formId,
      target: page.next,
      condition: undefined,
    });
    for (const rule of page.nextWhen ?? []) {
      pushEdge({
        from: page.formId,
        target: rule.then,
        condition: { fieldId: rule.fieldId, value: rule.value },
      });
    }
  }

  // 4. Summary's `next` becomes an outgoing edge from the summary node
  if (summarySchema) {
    pushEdge({
      from: SUMMARY_NODE_ID,
      target: summarySchema.next,
      condition: undefined,
    });
  }

  function pushEdge(opts: {
    from: string;
    target: string;
    condition: BuilderEdgeData['condition'];
  }) {
    // An empty token means "no navigation set yet" (fresh page, or the
    // user deleted the edge). Render no edge and no phantom external
    // node — the validation panel is what flags the missing `next`.
    if (!opts.target) return;
    const targetId = resolveTarget(opts.target, formSchema);
    // Ensure external/synthetic targets exist as nodes.
    if (
      targetId.startsWith(EXTERNAL_NODE_PREFIX) ||
      (targetId === SUMMARY_NODE_ID && !summarySchema)
    ) {
      if (!externalNodeIds.has(targetId)) {
        externalNodeIds.add(targetId);
        const pos = layout[targetId] ?? { x: 800, y: 240 + externalNodeIds.size * 80 };
        nodes.push({
          id: targetId,
          type: 'external',
          position: pos,
          data: { kind: 'external', token: opts.target },
        });
      }
    }
    edges.push(buildEdge(opts.from, targetId, opts.condition));
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// canvasToSchema — strict inverse of schemaToCanvas.
// Forms[] order is taken from a separately-maintained order list; the
// caller is responsible for keeping it in sync (the store handles that).
// ---------------------------------------------------------------------------

export function canvasToSchema(input: {
  journeyId: string;
  nodes: BuilderNode[];
  edges: BuilderEdge[];
  formOrder: string[];
  looping?: FormSchema['looping'];
  schemaVersion?: string;
}): { formSchema: FormSchema; summarySchema?: SummarySchema } {
  const { journeyId, nodes, edges, formOrder, looping, schemaVersion } = input;

  const formNodes = new Map<string, BuilderNode>();
  let hubNode: BuilderNode | undefined;
  let taskListNode: BuilderNode | undefined;
  let summaryNode: BuilderNode | undefined;
  const externalById = new Map<string, BuilderNode>();

  for (const n of nodes) {
    if (n.data.kind === 'form') formNodes.set(n.id, n);
    else if (n.data.kind === 'hub') hubNode = n;
    else if (n.data.kind === 'task-list') taskListNode = n;
    else if (n.data.kind === 'summary') summaryNode = n;
    else if (n.data.kind === 'external') externalById.set(n.id, n);
  }

  // Group edges by source.
  const outgoing = new Map<string, BuilderEdge[]>();
  for (const e of edges) {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e);
  }

  // Reconstruct each form page from its node + outgoing edges.
  const formPages: FormPage[] = formOrder
    .map((id) => formNodes.get(id))
    .filter((n): n is BuilderNode => n !== undefined && n.data.kind === 'form')
    .map((n) => {
      const original = (n.data as Extract<BuilderNodeData, { kind: 'form' }>).page;
      const out = outgoing.get(n.id) ?? [];
      const def = out.find((e) => !e.data?.condition);
      const conds = out.filter((e) => !!e.data?.condition);

      const next = def
        ? targetTokenOf(def, formNodes, summaryNode, externalById)
        : original.next;

      const nextWhen: NextWhenRule[] = conds
        .map((e) => {
          const condition = e.data!.condition!;
          const target = targetTokenOf(e, formNodes, summaryNode, externalById);
          return { fieldId: condition.fieldId, value: condition.value, then: target };
        });

      return {
        ...original,
        next,
        ...(nextWhen.length > 0 ? { nextWhen } : {}),
      };
    });

  // Other JourneyPage variants (hub / task-list) come back unchanged from
  // their node data — they don't have outgoing edges that affect the schema.
  const orderedPages: JourneyPage[] = [];
  if (hubNode) orderedPages.push((hubNode.data as Extract<BuilderNodeData, { kind: 'hub' }>).page);
  if (taskListNode)
    orderedPages.push(
      (taskListNode.data as Extract<BuilderNodeData, { kind: 'task-list' }>).page,
    );
  orderedPages.push(...formPages);

  const formSchema: FormSchema = {
    journeyId,
    forms: orderedPages,
    ...(looping ? { looping } : {}),
    ...(schemaVersion ? { schemaVersion } : {}),
  };

  // Summary, if present.
  let summarySchema: SummarySchema | undefined;
  if (summaryNode) {
    const original = (summaryNode.data as Extract<BuilderNodeData, { kind: 'summary' }>).page;
    const out = outgoing.get(SUMMARY_NODE_ID) ?? [];
    const def = out.find((e) => !e.data?.condition);
    const next = def
      ? targetTokenOf(def, formNodes, summaryNode, externalById)
      : original.next;
    summarySchema = { ...original, next };
  }

  return { formSchema, ...(summarySchema ? { summarySchema } : {}) };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isFormPage(page: JourneyPage): page is FormPage {
  return page.type === undefined || page.type === 'form';
}

function kindOf(page: JourneyPage): BuilderNodeKind {
  if (page.type === 'hub') return 'hub';
  if (page.type === 'task-list') return 'task-list';
  return 'form';
}

function pageNodeId(page: JourneyPage): string {
  if (page.type === 'hub') return `${HUB_NODE_PREFIX}${page.id}`;
  if (page.type === 'task-list') return `${TASKLIST_NODE_PREFIX}${page.id}`;
  return page.formId;
}

function pageData(page: JourneyPage): BuilderNodeData {
  if (page.type === 'hub') return { kind: 'hub', page };
  if (page.type === 'task-list') return { kind: 'task-list', page };
  return { kind: 'form', page };
}

function defaultPosition(page: JourneyPage, idx: number): { x: number; y: number } {
  if (page.type === 'hub' || page.type === 'task-list') return { x: 60, y: 80 };
  return { x: 80 + idx * 240, y: 240 };
}

function edgeId(
  from: string,
  to: string,
  cond: BuilderEdgeData['condition'],
): string {
  return cond ? `${from}->${to}:${cond.fieldId}=${cond.value}` : `${from}->${to}`;
}

// Edge palette: default `next` edges read as neutral flow; conditional
// `nextWhen` branches are amber so branching logic stands out at a glance.
const EDGE_COLOR_DEFAULT = '#64748b'; // slate-500
const EDGE_COLOR_BRANCH = '#d97706'; // amber-600

function buildEdge(
  from: string,
  targetId: string,
  condition: BuilderEdgeData['condition'],
): BuilderEdge {
  const color = condition ? EDGE_COLOR_BRANCH : EDGE_COLOR_DEFAULT;
  return {
    id: edgeId(from, targetId, condition),
    source: from,
    target: targetId,
    type: 'smoothstep',
    style: { stroke: color, strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color },
    ...(condition
      ? {
          label: `${condition.fieldId} = ${condition.value}`,
          labelStyle: { fill: '#92400e', fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: '#fef3c7', stroke: '#fcd34d', strokeWidth: 1 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 4,
          data: { condition },
        }
      : {}),
  };
}

/**
 * Resolve a `next` / `then` token to a node id on the canvas.
 *   - Same-journey formId  → that form node's id
 *   - 'summary'            → SUMMARY_NODE_ID (works whether or not the
 *                            summary node exists; missing summary becomes
 *                            an external node so the edge still renders)
 *   - other reserved tokens (task-list, journey:*, add-instance:*,
 *     parent-summary, journey-root) → external node id
 */
function resolveTarget(token: string, formSchema: FormSchema): string {
  if (token === 'summary') return SUMMARY_NODE_ID;
  // Form id within the same journey?
  const inSameJourney = formSchema.forms.some(
    (p) =>
      (p.type === undefined || p.type === 'form') &&
      (p as FormPage).formId === token,
  );
  if (inSameJourney) return token;
  return `${EXTERNAL_NODE_PREFIX}${token}`;
}

function targetTokenOf(
  edge: BuilderEdge,
  formNodes: Map<string, BuilderNode>,
  summaryNode: BuilderNode | undefined,
  externalById: Map<string, BuilderNode>,
): string {
  if (formNodes.has(edge.target)) return edge.target;
  if (summaryNode && edge.target === SUMMARY_NODE_ID) return 'summary';
  const ext = externalById.get(edge.target);
  if (ext && ext.data.kind === 'external') return ext.data.token;
  // Last resort: strip prefix.
  if (edge.target.startsWith(EXTERNAL_NODE_PREFIX)) {
    return edge.target.slice(EXTERNAL_NODE_PREFIX.length);
  }
  return edge.target;
}

/** List of formIds in their schema order — used by the store on load. */
export function formOrderOf(formSchema: FormSchema): string[] {
  return formSchema.forms
    .filter((p): p is FormPage => p.type === undefined || p.type === 'form')
    .map((p) => p.formId);
}
