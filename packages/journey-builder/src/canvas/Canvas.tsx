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
 *       • click a node         → setSelectedNode
 *       • Delete key on node   → removePageByNodeId
 *
 * Conditional `nextWhen` edges are managed from the inspector (M3); the
 * canvas-level edge-create only sets the default `next`.
 */

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeMouseHandler,
  type NodeMouseHandler,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  schemaToCanvas,
  type BuilderEdge,
  type BuilderNode,
} from '../schema';
import { selectActiveJourney, useBuilderStore, type AddPageKind } from '../store';
import { nodeTypes } from './nodes';

const PALETTE_DT = 'application/teleportal-builder';

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
  const setSelectedNode = useBuilderStore((s) => s.setSelectedNode);
  const setSelectedEdge = useBuilderStore((s) => s.setSelectedEdge);
  const setNodePosition = useBuilderStore((s) => s.setNodePosition);
  const addPage = useBuilderStore((s) => s.addPage);
  const applyPattern = useBuilderStore((s) => s.applyPattern);
  const removePageByNodeId = useBuilderStore((s) => s.removePageByNodeId);
  const setFormNext = useBuilderStore((s) => s.setFormNext);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

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

  return (
    <div ref={wrapperRef} className="h-full w-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodesDelete={handleNodesDelete}
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
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: '#94a3b8' },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap pannable />
      </ReactFlow>
    </div>
  );
}
