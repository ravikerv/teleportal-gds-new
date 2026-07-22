/**
 * Alignment helper lines. While a node drags, we compare its edges and
 * centers against every other node on the canvas; within SNAP_DISTANCE
 * the drag position snaps to exact alignment and a guide line renders
 * across the canvas (flow coordinates, via ViewportPortal).
 *
 * `getHelperLines` is pure — it takes the in-flight position change and
 * returns the guide coordinates plus the snapped position, so it is
 * trivially unit-testable and stays out of React Flow's internals.
 */

import { ViewportPortal, type NodePositionChange } from '@xyflow/react';

import type { BuilderNode } from '../schema';

const SNAP_DISTANCE = 6;
const FALLBACK_WIDTH = 200;
const FALLBACK_HEIGHT = 92;

export type HelperLineResult = {
  /** y coordinate (flow space) of the horizontal guide, if any. */
  horizontal?: number;
  /** x coordinate (flow space) of the vertical guide, if any. */
  vertical?: number;
  /** Position with snapping applied — always safe to assign back. */
  snapPosition: { x: number; y: number };
};

export function getHelperLines(
  change: NodePositionChange,
  nodes: BuilderNode[],
  distance: number = SNAP_DISTANCE,
): HelperLineResult {
  const position = change.position;
  const dragged = nodes.find((n) => n.id === change.id);
  if (!position || !dragged) {
    return { snapPosition: { x: position?.x ?? 0, y: position?.y ?? 0 } };
  }

  const w = dragged.measured?.width ?? FALLBACK_WIDTH;
  const h = dragged.measured?.height ?? FALLBACK_HEIGHT;

  // Candidate x-lines of the dragged node (left, center, right) and how to
  // recover the node x from a matched line.
  const xLines = (x: number) => [
    { at: x, toX: (v: number) => v },
    { at: x + w / 2, toX: (v: number) => v - w / 2 },
    { at: x + w, toX: (v: number) => v - w },
  ];
  const yLines = (y: number) => [
    { at: y, toY: (v: number) => v },
    { at: y + h / 2, toY: (v: number) => v - h / 2 },
    { at: y + h, toY: (v: number) => v - h },
  ];

  let bestV: { line: number; x: number; d: number } | undefined;
  let bestH: { line: number; y: number; d: number } | undefined;

  for (const other of nodes) {
    if (other.id === change.id) continue;
    const ow = other.measured?.width ?? FALLBACK_WIDTH;
    const oh = other.measured?.height ?? FALLBACK_HEIGHT;
    const otherX = [other.position.x, other.position.x + ow / 2, other.position.x + ow];
    const otherY = [other.position.y, other.position.y + oh / 2, other.position.y + oh];

    for (const mine of xLines(position.x)) {
      for (const ox of otherX) {
        const d = Math.abs(mine.at - ox);
        if (d < distance && (!bestV || d < bestV.d)) {
          bestV = { line: ox, x: mine.toX(ox), d };
        }
      }
    }
    for (const mine of yLines(position.y)) {
      for (const oy of otherY) {
        const d = Math.abs(mine.at - oy);
        if (d < distance && (!bestH || d < bestH.d)) {
          bestH = { line: oy, y: mine.toY(oy), d };
        }
      }
    }
  }

  return {
    ...(bestH ? { horizontal: bestH.line } : {}),
    ...(bestV ? { vertical: bestV.line } : {}),
    snapPosition: {
      x: bestV ? bestV.x : position.x,
      y: bestH ? bestH.y : position.y,
    },
  };
}

const LINE_COLOR = '#0ea5e9'; // sky-500
const LINE_EXTENT = 100000;

export function HelperLines(props: { horizontal?: number; vertical?: number }) {
  const { horizontal, vertical } = props;
  if (horizontal === undefined && vertical === undefined) return null;
  return (
    <ViewportPortal>
      {horizontal !== undefined ? (
        <div
          className="pointer-events-none"
          style={{
            position: 'absolute',
            left: -LINE_EXTENT / 2,
            top: horizontal,
            width: LINE_EXTENT,
            height: 1,
            background: LINE_COLOR,
            zIndex: 10,
          }}
        />
      ) : null}
      {vertical !== undefined ? (
        <div
          className="pointer-events-none"
          style={{
            position: 'absolute',
            left: vertical,
            top: -LINE_EXTENT / 2,
            width: 1,
            height: LINE_EXTENT,
            background: LINE_COLOR,
            zIndex: 10,
          }}
        />
      ) : null}
    </ViewportPortal>
  );
}
