/**
 * Shared editor for the body of a task-list (master or journey-level):
 * tasks (flat) OR sections (sections-of-tasks), plus footer actions.
 *
 * Mode: a task-list uses *either* `tasks` or `sections` — the schema
 * doesn't allow both rendered at once. The editor exposes a mode toggle
 * so authors can switch between simple flat lists and sectioned ones.
 *
 * Footer actions are buttons (Save / Delete / etc.) whose semantics are
 * handled by the engine via `actionId`.
 */

import type {
  TaskListFooterAction,
  TaskListItem,
  TaskListSection,
  TaskStatus,
} from '../schema';
import {
  ActionButton,
  Field,
  Section,
  Select,
  TextInput,
} from './controls';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cannot-start', label: 'Cannot start' },
];

const VARIANT_OPTIONS: { value: NonNullable<TaskListFooterAction['variant']>; label: string }[] =
  [
    { value: 'primary', label: 'Primary' },
    { value: 'secondary', label: 'Secondary' },
    { value: 'warning', label: 'Warning' },
    { value: 'inverse', label: 'Inverse' },
  ];

export type TaskListBodyValue = {
  tasks?: TaskListItem[];
  sections?: TaskListSection[];
  footerActions?: TaskListFooterAction[];
};

export function TaskListBody(props: TaskListBodyValue & {
  onChange: (patch: TaskListBodyValue) => void;
}) {
  const { tasks, sections, footerActions, onChange } = props;
  const mode: 'flat' | 'sections' =
    sections && sections.length > 0 ? 'sections' : 'flat';

  const switchToFlat = () =>
    onChange({
      tasks: tasks ?? sections?.flatMap((s) => s.tasks) ?? [],
      sections: undefined,
    });
  const switchToSections = () =>
    onChange({
      sections:
        sections ?? [
          {
            id: 'section-1',
            title: 'Section 1',
            tasks: tasks ?? [],
          },
        ],
      tasks: undefined,
    });

  return (
    <>
      <Section
        title={`Tasks (${mode})`}
        action={
          <div className="flex gap-1">
            <ActionButton
              variant={mode === 'flat' ? 'primary' : 'ghost'}
              onClick={switchToFlat}
            >
              flat
            </ActionButton>
            <ActionButton
              variant={mode === 'sections' ? 'primary' : 'ghost'}
              onClick={switchToSections}
            >
              sections
            </ActionButton>
          </div>
        }
      >
        {mode === 'flat' ? (
          <FlatTasksEditor
            tasks={tasks ?? []}
            onChange={(next) => onChange({ tasks: next, sections: undefined })}
          />
        ) : (
          <SectionsEditor
            sections={sections ?? []}
            onChange={(next) => onChange({ sections: next, tasks: undefined })}
          />
        )}
      </Section>

      <FooterActionsEditor
        actions={footerActions ?? []}
        onChange={(next) =>
          onChange({ footerActions: next.length === 0 ? undefined : next })
        }
      />
    </>
  );
}

function FlatTasksEditor(props: {
  tasks: TaskListItem[];
  onChange: (next: TaskListItem[]) => void;
}) {
  const { tasks, onChange } = props;
  const setTask = (i: number, patch: Partial<TaskListItem>) =>
    onChange(tasks.map((t, j) => (i === j ? ({ ...t, ...patch } as TaskListItem) : t)));
  const removeTask = (i: number) => onChange(tasks.filter((_, j) => j !== i));
  const addTask = () =>
    onChange([
      ...tasks,
      {
        id: uniqueId(tasks.map((t) => t.id), 'task'),
        label: 'New task',
        status: 'not-started',
      },
    ]);

  return (
    <div className="flex flex-col gap-2">
      {tasks.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500">
          No tasks yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((t, i) => (
            <TaskRow
              key={t.id}
              task={t}
              onChange={(patch) => setTask(i, patch)}
              onRemove={() => removeTask(i)}
            />
          ))}
        </ul>
      )}
      <ActionButton onClick={addTask}>+ Add task</ActionButton>
    </div>
  );
}

function SectionsEditor(props: {
  sections: TaskListSection[];
  onChange: (next: TaskListSection[]) => void;
}) {
  const { sections, onChange } = props;
  const setSection = (i: number, patch: Partial<TaskListSection>) =>
    onChange(sections.map((s, j) => (i === j ? { ...s, ...patch } : s)));
  const removeSection = (i: number) => onChange(sections.filter((_, j) => j !== i));
  const addSection = () =>
    onChange([
      ...sections,
      {
        id: uniqueId(sections.map((s) => s.id), 'section'),
        title: 'New section',
        tasks: [],
      },
    ]);

  return (
    <div className="flex flex-col gap-2">
      {sections.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500">
          No sections yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sections.map((s, i) => (
            <li key={s.id} className="flex flex-col gap-1.5 rounded border border-slate-200 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Section {s.id}
                </span>
                <ActionButton variant="ghost" onClick={() => removeSection(i)}>
                  remove
                </ActionButton>
              </div>
              <Field label="Section id">
                <TextInput value={s.id} onChange={(v) => setSection(i, { id: v })} monospace />
              </Field>
              <Field label="Section title">
                <TextInput value={s.title} onChange={(v) => setSection(i, { title: v })} />
              </Field>
              <FlatTasksEditor
                tasks={s.tasks}
                onChange={(tasks) => setSection(i, { tasks })}
              />
            </li>
          ))}
        </ul>
      )}
      <ActionButton onClick={addSection}>+ Add section</ActionButton>
    </div>
  );
}

function TaskRow(props: {
  task: TaskListItem;
  onChange: (patch: Partial<TaskListItem>) => void;
  onRemove: () => void;
}) {
  const { task, onChange, onRemove } = props;
  return (
    <li className="flex flex-col gap-1.5 rounded border border-slate-200 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Task
        </span>
        <ActionButton variant="ghost" onClick={onRemove}>
          remove
        </ActionButton>
      </div>
      <Field label="Task id (also the journey id it links to)">
        <TextInput
          value={task.id}
          onChange={(v) => onChange({ id: v })}
          monospace
        />
      </Field>
      <Field label="Label">
        <TextInput value={task.label} onChange={(v) => onChange({ label: v })} />
      </Field>
      <Field label="Status">
        <Select
          value={task.status}
          onChange={(v) => onChange({ status: v })}
          options={STATUS_OPTIONS}
        />
      </Field>
      <Field label="Status label override (optional)">
        <TextInput
          value={task.statusLabel ?? ''}
          onChange={(v) =>
            onChange(v === '' ? { statusLabel: undefined } : { statusLabel: v })
          }
        />
      </Field>
      <Field
        label="Depends on (comma-separated)"
        hint="Other task ids that must be completed before this one is enabled"
      >
        <TextInput
          value={(task.dependsOn ?? []).join(', ')}
          onChange={(v) => {
            const ids = v
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            onChange({ dependsOn: ids.length === 0 ? undefined : ids });
          }}
          monospace
        />
      </Field>
    </li>
  );
}

function FooterActionsEditor(props: {
  actions: TaskListFooterAction[];
  onChange: (next: TaskListFooterAction[]) => void;
}) {
  const { actions, onChange } = props;
  const setAction = (i: number, patch: Partial<TaskListFooterAction>) =>
    onChange(actions.map((a, j) => (i === j ? { ...a, ...patch } : a)));
  const removeAction = (i: number) => onChange(actions.filter((_, j) => j !== i));
  const addAction = () =>
    onChange([
      ...actions,
      {
        label: 'New action',
        actionId: uniqueId(actions.map((a) => a.actionId), 'action'),
      },
    ]);

  return (
    <Section
      title={`Footer actions (${actions.length})`}
      action={<ActionButton onClick={addAction}>+ Add action</ActionButton>}
    >
      {actions.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500">
          No footer actions.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {actions.map((a, i) => (
            <li
              key={a.actionId}
              className="flex flex-col gap-1.5 rounded border border-slate-200 p-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Action
                </span>
                <ActionButton variant="ghost" onClick={() => removeAction(i)}>
                  remove
                </ActionButton>
              </div>
              <Field label="Label">
                <TextInput value={a.label} onChange={(v) => setAction(i, { label: v })} />
              </Field>
              <Field label="Action id (engine handler key)">
                <TextInput
                  value={a.actionId}
                  onChange={(v) => setAction(i, { actionId: v })}
                  monospace
                />
              </Field>
              <Field label="Variant">
                <Select
                  value={a.variant ?? 'primary'}
                  onChange={(v) => setAction(i, { variant: v })}
                  options={VARIANT_OPTIONS}
                />
              </Field>
              <Field label="Redirect to (optional, default '/')">
                <TextInput
                  value={a.redirectTo ?? ''}
                  onChange={(v) =>
                    setAction(i, v === '' ? { redirectTo: undefined } : { redirectTo: v })
                  }
                  monospace
                />
              </Field>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function uniqueId(existing: string[], prefix: string): string {
  for (let i = 1; i < 10000; i++) {
    const id = `${prefix}-${i}`;
    if (!existing.includes(id)) return id;
  }
  throw new Error('Exhausted ids');
}
