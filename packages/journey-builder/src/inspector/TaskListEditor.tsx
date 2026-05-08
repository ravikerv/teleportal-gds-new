/**
 * Editor for a `TaskListJourneyPage`. Shares the underlying tasks /
 * sections editor (`TaskListBody`) with the master-task-list view, so a
 * BA edits both surfaces with the same controls.
 */

import type { TaskListJourneyPage } from '../schema';
import { useBuilderStore } from '../store';
import { Field, Section, TextArea, TextInput } from './controls';
import { TaskListBody } from './TaskListBody';

export function TaskListEditor(props: {
  journeyId: string;
  page: TaskListJourneyPage;
}) {
  const { journeyId, page } = props;
  const update = useBuilderStore((s) => s.updateTaskListPage);

  return (
    <div className="flex flex-col gap-3">
      <Section title="Task list page">
        <Field label="Task-list id">
          <TextInput
            value={page.id}
            onChange={(v) => update(journeyId, page.id, { id: v })}
            monospace
          />
        </Field>
        <Field label="Title">
          <TextInput
            value={page.title}
            onChange={(v) => update(journeyId, page.id, { title: v })}
          />
        </Field>
        <Field label="Caption (optional)">
          <TextInput
            value={page.caption ?? ''}
            onChange={(v) =>
              update(journeyId, page.id, v === '' ? { caption: undefined } : { caption: v })
            }
          />
        </Field>
        <Field label="Description (optional)">
          <TextArea
            value={page.description ?? ''}
            onChange={(v) =>
              update(journeyId, page.id, v === '' ? { description: undefined } : { description: v })
            }
          />
        </Field>
      </Section>

      <Section title="Navigation">
        <Field label="Back token (optional)">
          <TextInput
            value={page.back ?? ''}
            onChange={(v) =>
              update(journeyId, page.id, v === '' ? { back: undefined } : { back: v })
            }
            monospace
          />
        </Field>
      </Section>

      <TaskListBody
        tasks={page.tasks}
        sections={page.sections}
        footerActions={page.footerActions}
        onChange={(patch) => update(journeyId, page.id, patch)}
      />
    </div>
  );
}
