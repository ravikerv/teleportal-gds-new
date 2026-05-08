/**
 * Master task list view. The same `TaskListBody` editor used by the
 * inspector for journey-level task-list pages is reused here, so every
 * tasks/sections/footer-action surface in the project is authored with
 * identical controls.
 *
 * On top of the editor we render a compact preview pane: each task is
 * a click-through to its referenced journey when one exists. That gives
 * BAs the orientation they need without leaving the master surface.
 */

import { useMemo } from 'react';

import { TaskListBody } from '../inspector/TaskListBody';
import type { TaskListItem } from '../schema';
import { useBuilderStore } from '../store';

export function MasterTaskListView() {
  const project = useBuilderStore((s) => s.project);
  const setActiveJourney = useBuilderStore((s) => s.setActiveJourney);
  const updateMasterTaskList = useBuilderStore((s) => s.updateMasterTaskList);

  const taskList = project.taskList;
  const known = useMemo(
    () => new Set(Object.keys(project.journeys)),
    [project.journeys],
  );

  const sections = taskList.sections ?? [];
  const flat = taskList.tasks ?? [];

  return (
    <div className="grid h-full grid-cols-2 overflow-hidden bg-slate-50">
      <div className="overflow-y-auto p-6">
        <div className="space-y-4">
          <header className="space-y-1">
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
              master task list
            </span>
            <input
              type="text"
              value={taskList.title}
              onChange={(e) => updateMasterTaskList({ title: e.target.value })}
              className="block w-full border-0 bg-transparent text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 rounded px-1 -mx-1"
              placeholder="(untitled application)"
            />
          </header>

          {sections.length > 0 ? (
            <div className="space-y-4">
              {sections.map((section) => (
                <section
                  key={section.id}
                  className="rounded border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <h2 className="mb-2 text-base font-semibold text-slate-700">
                    {section.title}
                  </h2>
                  <TaskRows
                    tasks={section.tasks}
                    known={known}
                    onOpen={setActiveJourney}
                  />
                </section>
              ))}
            </div>
          ) : flat.length > 0 ? (
            <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <TaskRows
                tasks={flat}
                known={known}
                onOpen={setActiveJourney}
              />
            </section>
          ) : (
            <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No tasks yet. Use the editor on the right to add sections / tasks.
            </div>
          )}

          {taskList.footerActions && taskList.footerActions.length > 0 ? (
            <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Footer actions
              </h2>
              <ul className="flex flex-wrap gap-2">
                {taskList.footerActions.map((a) => (
                  <li
                    key={a.actionId}
                    className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                  >
                    <span className="font-medium">{a.label}</span>
                    <span className="ml-2 text-[10px] text-slate-500">({a.actionId})</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <div className="overflow-y-auto border-l border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Editor
        </h2>
        <TaskListBody
          tasks={taskList.tasks}
          sections={taskList.sections}
          footerActions={taskList.footerActions}
          onChange={(patch) => updateMasterTaskList(patch)}
        />
      </div>
    </div>
  );
}

function TaskRows({
  tasks,
  known,
  onOpen,
}: {
  tasks: TaskListItem[];
  known: Set<string>;
  onOpen: (journeyId: string) => void;
}) {
  return (
    <ul className="divide-y divide-slate-200">
      {tasks.map((t) => {
        const target = t.type === 'nested-journey' ? t.journeyRef : t.id;
        const exists = known.has(target);
        return (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3 py-1.5 text-sm"
          >
            <button
              type="button"
              onClick={() => exists && onOpen(target)}
              disabled={!exists}
              className={`flex-1 truncate text-left ${
                exists ? 'text-blue-700 hover:underline' : 'text-slate-400 italic'
              }`}
            >
              {t.label}
              {!exists ? <span className="ml-2 text-[10px]">(no journey)</span> : null}
            </button>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
              {t.statusLabel ?? t.status.replace('-', ' ')}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
