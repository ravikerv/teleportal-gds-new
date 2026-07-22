/**
 * React Flow canvas, schema-driven.
 *
 *   - Schema (Zustand store) is the source of truth.
 *   - schemaToCanvas() derives `{ nodes, edges }` for the active journey.
 *   - React Flow runs with its own internal state via useNodesState /
 *     useEdgesState; an effect re-syncs from the store on mutation.
 *   - User mutations:
 *       • drag on canvas       → setNodePosition (layout side-car only)
 *       • drop a palette item  → addPage (mints a new schema entry)
 *       • drag an edge         → setFormNext / setSummaryNext (replaces `next`)
 *       • delete an edge       → clears `next` / removes the nextWhen rule
 *       • click a node         → setSelectedNode
 *       • Delete key on node   → removePageByNodeId
 *       • "Tidy up" button     → dagre auto-layout via applyLayout
 *
 * Drags get alignment helper lines (with snapping); validation issues are
 * computed once per project mutation and fed to nodes via context for the
 * per-node badges. Conditional `nextWhen` edges are managed from the
 * inspector (M3); the canvas-level edge-create only sets the default `next`.
 */

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeMouseHandler,
  type NodeChange,
  type NodeMouseHandler,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  SUMMARY_NODE_ID,
  schemaToCanvas,
  type BuilderEdge,
  type BuilderNode,
} from '../schema';
import { selectActiveJourney, useBuilderStore, type AddPageKind } from '../store';
import { validateProject } from '../validation/checks';
import { HelperLines, getHelperLines } from './helperLines';
import { computeTidyLayout } from './layout';
import { NodeIssuesContext, nodeTypes, type NodeIssueCounts } from './nodes';

const PALETTE_DT = 'application/teleportal-builder';

// GOV.UK-content-styled wording for the canvas chrome and keyboard help.
const ARIA_LABELS = {
  'node.a11yDescription.default':
    'Press Enter or Space to select this page. Press Delete to remove it, or Escape to cancel.',
  'node.a11yDescription.keyboardDisabled':
    'Press Enter or Space to select this page. Use the arrow keys to move it. Press Delete to remove it, or Escape to cancel.',
  'node.a11yDescription.ariaLiveMessage': ({
    direction,
    x,
    y,
  }: {
    direction: string;
    x: number;
    y: number;
  }) => `Moved page ${direction}. New position: ${x} across, ${y} down.`,
  'edge.a11yDescription.default':
    'Press Enter or Space to select this connection. Press Delete to remove it, or Escape to cancel.',
  'controls.ariaLabel': 'Canvas controls',
  'controls.zoomIn.ariaLabel': 'Zoom in',
  'controls.zoomOut.ariaLabel': 'Zoom out',
  'controls.fitView.ariaLabel': 'Fit the journey in view',
  'controls.interactive.ariaLabel': 'Lock or unlock editing',
  'minimap.ariaLabel': 'Journey overview map',
  'handle.ariaLabel': 'Connection point',
};

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}

function CanvasInner() {
  const journey = useBuilderStore(selectActiveJourney);
  const activeJourneyId = useBuilderStore((s) => s.activeJourneyId);
  const project = useBuilderStore((s) => s.project);
  const setSelectedNode = useBuilderStore((s) => s.setSelectedNode);
  const setSelectedEdge = useBuilderStore((s) => s.setSelectedEdge);
  const setNodePosition = useBuilderStore((s) => s.setNodePosition);
  const applyLayout = useBuilderStore((s) => s.applyLayout);
  const addPage = useBuilderStore((s) => s.addPage);
  const applyPattern = useBuilderStore((s) => s.applyPattern);
  const removePageByNodeId = useBuilderStore((s) => s.removePageByNodeId);
  const setFormNext = useBuilderStore((s) => s.setFormNext);
  const updateFormPage = useBuilderStore((s) => s.updateFormPage);
  const updateSummary = useBuilderStore((s) => s.updateSummary);
  const removeNextWhen = useBuilderStore((s) => s.removeNextWhen);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const {
    screenToFlowPosition,
    flowToScreenPosition,
    fitView,
    getNodes,
    getViewport,
    setCenter,
  } = useReactFlow<BuilderNode, BuilderEdge>();
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);

  const derived = useMemo<{
    nodes: BuilderNode[];
    edges: BuilderEdge[];
  }>(() => {
    if (!journey) return { nodes: [], edges: [] };
    return schemaToCanvas({
      formSchema: journey.formSchema,
      ...(journey.summarySchema ? { summarySchema: journey.summarySchema } : {}),
      layout: journey.layout,
    });
  }, [journey]);

  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNode>(derived.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<BuilderEdge>(derived.edges);

  // Re-sync React Flow's internal state whenever derived state changes.
  useEffect(() => {
    setNodes(derived.nodes);
  }, [derived.nodes, setNodes]);
  useEffect(() => {
    setEdges(derived.edges);
  }, [derived.edges, setEdges]);

  // When a page is added and selected (palette click-to-add) but lands
  // outside the viewport, pan to it so the user sees what they created.
  const knownNodeIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const ids = new Set(derived.nodes.map((n) => n.id));
    const previous = knownNodeIds.current;
    knownNodeIds.current = ids;
    if (previous.size === 0) return; // initial mount / journey switch: fitView covers it
    if (!selectedNodeId || previous.has(selectedNodeId) || !ids.has(selectedNodeId)) return;
    const node = derived.nodes.find((n) => n.id === selectedNodeId);
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!node || !rect) return;
    const screen = flowToScreenPosition(node.position);
    const margin = 40;
    const inView =
      screen.x >= rect.left + margin &&
      screen.x <= rect.right - 240 &&
      screen.y >= rect.top + margin &&
      screen.y <= rect.bottom - 140;
    if (!inView) {
      void setCenter(node.position.x + 110, node.position.y + 46, {
        zoom: getViewport().zoom,
        duration: 300,
      });
    }
  }, [derived.nodes, selectedNodeId, flowToScreenPosition, getViewport, setCenter]);

  // Per-node validation issue counts for the badge chips. Computed once per
  // project mutation, scoped to the active journey.
  const issuesByNode = useMemo(() => {
    const map = new Map<string, NodeIssueCounts>();
    for (const issue of validateProject(project)) {
      if (issue.journeyId !== activeJourneyId || !issue.nodeId) continue;
      const counts = map.get(issue.nodeId) ?? { errors: 0, warnings: 0 };
      if (issue.severity === 'error') counts.errors += 1;
      else counts.warnings += 1;
      map.set(issue.nodeId, counts);
    }
    return map;
  }, [project, activeJourneyId]);

  // Alignment helper lines: intercept single-node drags, snap into
  // alignment, and surface the guide coordinates for the overlay.
  const [helperLines, setHelperLines] = useState<{
    horizontal?: number;
    vertical?: number;
  }>({});

  const handleNodesChange = useCallback(
    (changes: NodeChange<BuilderNode>[]) => {
      const first = changes.length === 1 ? changes[0] : undefined;
      const drag =
        first && first.type === 'position' && first.dragging && first.position
          ? first
          : null;
      if (drag) {
        const result = getHelperLines(drag, nodes);
        drag.position = result.snapPosition;
        setHelperLines({
          ...(result.horizontal !== undefined ? { horizontal: result.horizontal } : {}),
          ...(result.vertical !== undefined ? { vertical: result.vertical } : {}),
        });
      } else {
        setHelperLines((prev) =>
          prev.horizontal === undefined && prev.vertical === undefined ? prev : {},
        );
      }
      onNodesChange(changes);
    },
    [nodes, onNodesChange],
  );

  const handleNodeClick: NodeMouseHandler = (_e, node) => setSelectedNode(node.id);
  const handleEdgeClick: EdgeMouseHandler<BuilderEdge> = (_e, edge) =>
    setSelectedEdge(edge.id);
  const handlePaneClick = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(PALETTE_DT)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const payload = e.dataTransfer.getData(PALETTE_DT);
      if (!payload || !activeJourneyId) return;
      e.preventDefault();
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      if (payload.startsWith('page:')) {
        const kind = payload.slice('page:'.length) as AddPageKind;
        if (!['form', 'hub', 'task-list', 'summary'].includes(kind)) return;
        const newId = addPage(activeJourneyId, kind, position);
        if (newId) setSelectedNode(newId);
        return;
      }
      if (payload.startsWith('pattern:')) {
        const patternId = payload.slice('pattern:'.length);
        const newId = applyPattern(activeJourneyId, patternId, position);
        if (newId) setSelectedNode(newId);
        return;
      }
      // field:* drops on a Form node are an M3.5+ enhancement.
    },
    [activeJourneyId, addPage, applyPattern, screenToFlowPosition, setSelectedNode],
  );

  const handleConnect = useCallback(
    (params: Connection) => {
      if (!activeJourneyId || !params.source || !params.target) return;
      setFormNext(activeJourneyId, params.source, params.target);
    },
    [activeJourneyId, setFormNext],
  );

  const handleNodesDelete = useCallback(
    (deleted: BuilderNode[]) => {
      if (!activeJourneyId) return;
      for (const n of deleted) {
        removePageByNodeId(activeJourneyId, n.id);
      }
    },
    [activeJourneyId, removePageByNodeId],
  );

  // Deleting an edge clears the navigation it encodes: the `nextWhen`
  // rule for a branch edge, `summary.next` for the summary's outgoing
  // edge, or the form's default `next` otherwise.
  const handleEdgesDelete = useCallback(
    (deleted: BuilderEdge[]) => {
      if (!activeJourneyId) return;
      for (const edge of deleted) {
        const condition = edge.data?.condition;
        if (condition) {
          removeNextWhen(activeJourneyId, edge.source, condition.fieldId, condition.value);
        } else if (edge.source === SUMMARY_NODE_ID) {
          updateSummary(activeJourneyId, { next: '' });
        } else {
          updateFormPage(activeJourneyId, edge.source, { next: '' });
        }
      }
    },
    [activeJourneyId, removeNextWhen, updateSummary, updateFormPage],
  );

  const handleTidy = useCallback(() => {
    if (!activeJourneyId) return;
    const layout = computeTidyLayout(getNodes(), edges);
    applyLayout(activeJourneyId, layout);
    // Let the re-derived positions land before framing the result.
    requestAnimationFrame(() => {
      void fitView({ padding: 0.15, duration: 300 });
    });
  }, [activeJourneyId, getNodes, edges, applyLayout, fitView]);

  return (
    <NodeIssuesContext.Provider value={issuesByNode}>
      <div
        ref={wrapperRef}
        className="h-full w-full"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodesDelete={handleNodesDelete}
          onEdgesDelete={handleEdgesDelete}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onNodeDragStop={(_e, node) => {
            if (!activeJourneyId) return;
            setNodePosition(activeJourneyId, node.id, node.position);
          }}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
          snapToGrid
          snapGrid={[8, 8]}
          ariaLabelConfig={ARIA_LABELS}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap pannable />
          <HelperLines {...helperLines} />
          {nodes.length === 0 ? (
            <Panel position="top-center">
              <div className="mt-24 rounded-lg border border-dashed border-slate-300 bg-white/90 px-6 py-4 text-center text-sm text-slate-500 shadow-sm">
                This journey is empty.
                <br />
                Click a page in the palette, or drag one onto the canvas.
              </div>
            </Panel>
          ) : null}
          <Panel position="top-right">
            <button
              type="button"
              onClick={handleTidy}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
              title="Auto-arrange the journey left-to-right"
            >
              <span aria-hidden="true">✨ </span>Tidy up
            </button>
          </Panel>
        </ReactFlow>
      </div>
    </NodeIssuesContext.Provider>
  );
}
