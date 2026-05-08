/**
 * Derived: journey-relationship tree built from a Project.
 *
 * Edges are inferred from three places:
 *   1. The master TaskListSchema's `tasks` / `sections.*.tasks` —
 *      each task's id (or journeyRef) is treated as a child journey.
 *   2. Any sub-task-list page inside a journey's FormSchema — same.
 *   3. A journey's `looping.parentJourneyId` — looping → parent.
 *
 * Cycles are tolerated (we visit each journey at most once per branch).
 * Journeys not referenced anywhere are emitted as "orphan" roots so the
 * tree still surfaces them.
 */

import type {
  TaskListItem,
  TaskListJourneyPage,
  TaskListSchema,
} from '../schema';
import type { Project } from './index';

export type JourneyTreeNode = {
  journeyId: string;
  /** Display label — title from the journey, or the id when missing. */
  label: string;
  /**
   * Whether the journey is registered in `project.journeys`. False for
   * dangling references (e.g. master cites a journey we haven't built yet).
   */
  exists: boolean;
  isLooping: boolean;
  children: JourneyTreeNode[];
};

export type ProjectTree = {
  /** Top-level entries. Includes master-referenced journeys and any orphans. */
  roots: JourneyTreeNode[];
};

export function buildProjectTree(project: Project): ProjectTree {
  const all = project.journeys;
  const known = new Set(Object.keys(all));
  const referenced = new Set<string>();

  const masterChildren = listJourneyRefs(project.taskList);
  masterChildren.forEach((id) => referenced.add(id));

  // journeyId → list of child journeyIds (from sub-task-list + looping children).
  const childrenOf = new Map<string, string[]>();

  for (const [jid, journey] of Object.entries(all)) {
    const tlPage = journey.formSchema.forms.find(
      (p): p is TaskListJourneyPage => p.type === 'task-list',
    );
    if (tlPage) {
      const refs = listJourneyRefs(tlPage);
      childrenOf.set(jid, refs);
      refs.forEach((id) => referenced.add(id));
    }
  }

  for (const [jid, journey] of Object.entries(all)) {
    const looping = journey.formSchema.looping;
    if (!looping) continue;
    const parent = looping.parentJourneyId;
    const list = childrenOf.get(parent) ?? [];
    if (!list.includes(jid)) list.push(jid);
    childrenOf.set(parent, list);
    referenced.add(jid);
  }

  const visited = new Set<string>();
  const build = (id: string): JourneyTreeNode => {
    if (visited.has(id)) {
      return {
        journeyId: id,
        label: titleOf(project, id),
        exists: known.has(id),
        isLooping: known.has(id) && !!all[id]!.formSchema.looping,
        children: [],
      };
    }
    visited.add(id);
    return {
      journeyId: id,
      label: titleOf(project, id),
      exists: known.has(id),
      isLooping: known.has(id) && !!all[id]!.formSchema.looping,
      children: (childrenOf.get(id) ?? []).map(build),
    };
  };

  const roots = masterChildren.map(build);
  const orphans = [...known].filter((id) => !referenced.has(id) && !visited.has(id));
  return { roots: [...roots, ...orphans.map(build)] };
}

function listJourneyRefs(
  source: TaskListSchema | TaskListJourneyPage,
): string[] {
  const flat = collectTasks(source);
  return flat.map((t) =>
    t.type === 'nested-journey' ? t.journeyRef : t.id,
  );
}

function collectTasks(
  source: TaskListSchema | TaskListJourneyPage,
): TaskListItem[] {
  if (source.tasks && source.tasks.length > 0) return source.tasks;
  if (source.sections) return source.sections.flatMap((s) => s.tasks);
  return [];
}

function titleOf(project: Project, journeyId: string): string {
  const j = project.journeys[journeyId];
  if (!j) return journeyId;
  // Prefer hub / task-list / first-form title for a friendlier label.
  for (const p of j.formSchema.forms) {
    if (p.type === 'hub') return p.title;
    if (p.type === 'task-list') return p.title;
  }
  const firstForm = j.formSchema.forms.find(
    (p) => p.type === undefined || p.type === 'form',
  );
  if (firstForm && 'title' in firstForm) return (firstForm as { title: string }).title;
  return journeyId;
}
