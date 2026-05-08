/**
 * Compute on-disk paths for each journey based on the project tree.
 *
 * Output mirrors the runtime app's `schemas/applications/{id}/` layout —
 * e.g. an `occupier-details` journey nested under `occupier-of-the-land`
 * (because of `looping.parentJourneyId`) lands at:
 *   activities/occupier-of-the-land/occupier-details/
 *
 * Journeys not reachable from the master tree (orphans) are emitted at
 * the top level so nothing is lost on export.
 */

import type { Project } from '../store';
import { buildProjectTree, type JourneyTreeNode } from '../store/tree';

export type JourneyPathMap = Record<string, string>;

export function computeJourneyPaths(project: Project): JourneyPathMap {
  const tree = buildProjectTree(project);
  const paths: JourneyPathMap = {};
  walk(tree.roots, '', paths);
  return paths;
}

function walk(
  nodes: JourneyTreeNode[],
  parentPath: string,
  out: JourneyPathMap,
): void {
  for (const node of nodes) {
    const path = parentPath
      ? `${parentPath}/${node.journeyId}`
      : node.journeyId;
    if (node.exists && !out[node.journeyId]) {
      out[node.journeyId] = path;
    }
    walk(node.children, path, out);
  }
}
