/**
 * Project tree shown above the palette. Roots:
 *   - Master task list (always at the top)
 *   - Each top-level journey referenced from master, with sub-journeys
 *     and looping children nested
 *   - Orphan journeys (not referenced anywhere) appear at the bottom
 *
 * Click a row → switch active journey on the canvas. Looping children
 * carry a small "loop" badge so the relationship is obvious.
 */

import { Fragment, useMemo, useState } from 'react';

import { MASTER_VIEW_ID, useBuilderStore } from '../store';
import { buildProjectTree, type JourneyTreeNode } from '../store/tree';

export function ProjectTree() {
  const project = useBuilderStore((s) => s.project);
  const activeJourneyId = useBuilderStore((s) => s.activeJourneyId);
  const setActiveJourney = useBuilderStore((s) => s.setActiveJourney);

  const tree = useMemo(() => buildProjectTree(project), [project]);

  return (
    <div className="flex flex-col gap-1 text-xs">
      <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Project
      </h2>
      <button
        type="button"
        onClick={() => setActiveJourney(MASTER_VIEW_ID)}
        className={`flex items-center gap-1.5 rounded px-2 py-1 text-left ${
          activeJourneyId === MASTER_VIEW_ID
            ? 'bg-slate-900 text-white'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        <span className="rounded bg-slate-200 px-1 text-[10px] font-medium uppercase tracking-wide text-slate-700">
          master
        </span>
        <span className="truncate">{project.taskList.title || '(untitled)'}</span>
      </button>
      <div className="mt-1 flex flex-col gap-0.5">
        {tree.roots.map((node) => (
          <TreeRow
            key={node.journeyId}
            node={node}
            depth={0}
            activeId={activeJourneyId}
            onSelect={setActiveJourney}
          />
        ))}
      </div>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  activeId,
  onSelect,
}: {
  node: JourneyTreeNode;
  depth: number;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const isActive = node.exists && activeId === node.journeyId;

  return (
    <Fragment>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => hasChildren && setOpen((o) => !o)}
          className={`shrink-0 px-1 text-slate-400 hover:text-slate-700 ${hasChildren ? 'visible' : 'invisible'}`}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? '▾' : '▸'}
        </button>
        <button
          type="button"
          onClick={() => node.exists && onSelect(node.journeyId)}
          disabled={!node.exists}
          className={`flex flex-1 items-center gap-1.5 truncate rounded px-1 py-0.5 text-left ${
            isActive
              ? 'bg-slate-900 text-white'
              : node.exists
              ? 'text-slate-700 hover:bg-slate-100'
              : 'text-slate-400 italic'
          }`}
          style={{ paddingLeft: `${0.25 + depth * 0.75}rem` }}
        >
          {node.isLooping ? (
            <span className="rounded bg-amber-200 px-1 text-[9px] font-medium uppercase tracking-wide text-amber-800">
              loop
            </span>
          ) : null}
          <span className="truncate">{node.label}</span>
          {!node.exists ? <span className="ml-auto text-[10px]">missing</span> : null}
        </button>
      </div>
      {hasChildren && open
        ? node.children.map((child) => (
            <TreeRow
              key={child.journeyId}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))
        : null}
    </Fragment>
  );
}
