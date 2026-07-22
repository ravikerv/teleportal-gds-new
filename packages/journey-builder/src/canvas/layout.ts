/**
 * "Tidy up" auto-layout. Dagre arranges the journey graph left-to-right
 * (matching the natural reading order of a journey: entry → forms →
 * summary → exit), using each node's measured size when React Flow has
 * rendered it, with sensible fallbacks before first paint.
 *
 * Pure function: returns a LayoutMap for the store's `applyLayout`; it
 * never mutates React Flow state directly, so a tidy is a single undo
 * step like any other layout change.
 */

import dagre from '@dagrejs/dagre';

import type { BuilderEdge, BuilderNode, LayoutMap } from '../schema';

const FALLBACK_WIDTH = 200;
const FALLBACK_HEIGHT = 92;

export function computeTidyLayout(
  nodes: BuilderNode[],
  edges: BuilderEdge[],
): LayoutMap {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR',
    nodesep: 48,
    ranksep: 96,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    g.setNode(n.id, {
      width: n.measured?.width ?? FALLBACK_WIDTH,
      height: n.measured?.height ?? FALLBACK_HEIGHT,
    });
  }
  for (const e of edges) {
    // Parallel edges (default + branches to the same target) collapse to
    // one dagre edge — only connectivity matters for ranking.
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const layout: LayoutMap = {};
  for (const n of nodes) {
    const placed = g.node(n.id);
    if (!placed) continue;
    // Dagre positions node centers; React Flow positions top-left corners.
    layout[n.id] = {
      x: Math.round(placed.x - (n.measured?.width ?? FALLBACK_WIDTH) / 2),
      y: Math.round(placed.y - (n.measured?.height ?? FALLBACK_HEIGHT) / 2),
    };
  }
  return layout;
}
