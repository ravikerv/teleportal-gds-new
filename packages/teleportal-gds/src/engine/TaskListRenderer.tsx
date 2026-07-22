/**
 * Server Component rendering a TaskList page from a TaskListSchema.
 * Status for each task is computed at render time via
 * data.utils.computeTaskStatus, which combines:
 *   - schema-declared status,
 *   - runtime journey status from parent state,
 *   - dependsOn graph traversal (incomplete dep ⇒ cannot-start).
 *
 * Tasks with status `cannot-start` render as plain text (no link); all
 * other tasks link to the journey entry URL, where the consumer's
 * Next.js routing redirects to the journey's first form page.
 */

import { Fragment, type ReactElement } from 'react';

import type { TaskListEntry } from '../components/TaskList';
import { getDesignSystem } from '../design-systems/registry';
import { BLOB_PATHS } from '../shared/constants/index';
import type { ParentState } from '../shared/types/journey.types';
import type {
  TaskListFooterAction,
  TaskListItem,
  TaskListSchema,
} from '../shared/types/schema.types';
import { computeTaskStatus, loadOrInitParent } from '../shared/utils/data.utils';
import { resolveJourneyEntryPath } from '../shared/utils/navigation.utils';
import { readBlob } from '../shared/utils/storage.utils';
import { taskListFooterAction } from './formActions';

export type TaskListRendererProps = {
  applicationId: string;
  schema: TaskListSchema;
  parent: ParentState;
};

function toEntries(
  tasks: TaskListItem[],
  applicationId: string,
  parent: ParentState,
  schema: TaskListSchema,
): TaskListEntry[] {
  return tasks.map((task) => {
    const status = computeTaskStatus(task, parent, schema);
    const journeyId = task.type === 'nested-journey' ? task.journeyRef : task.id;
    const href =
      status === 'cannot-start'
        ? undefined
        : resolveJourneyEntryPath(applicationId, journeyId);
    const entry: TaskListEntry = {
      id: task.id,
      label: task.label,
      status,
    };
    if (href !== undefined) entry.href = href;
    if (task.statusLabel !== undefined) entry.statusLabel = task.statusLabel;
    return entry;
  });
}

function FooterActions({
  applicationId,
  actions,
}: {
  applicationId: string;
  actions: TaskListFooterAction[];
}): ReactElement | null {
  if (actions.length === 0) return null;
  const { components: c, tokens: t } = getDesignSystem();
  return (
    <div className={t.buttonGroup}>
      {actions.map((a) => {
        const action = taskListFooterAction.bind(
          null,
          applicationId,
          a.actionId,
          a.redirectTo ?? '/',
        );
        return (
          <form key={a.actionId} action={action}>
            <c.Button type="submit" variant={a.variant ?? 'primary'}>
              {a.label}
            </c.Button>
          </form>
        );
      })}
    </div>
  );
}

export function TaskListRenderer(props: TaskListRendererProps): ReactElement {
  const { applicationId, schema, parent } = props;
  const { components: c, tokens: t } = getDesignSystem();
  const footer = (
    <FooterActions
      applicationId={applicationId}
      actions={schema.footerActions ?? []}
    />
  );

  if (schema.sections && schema.sections.length > 0) {
    return (
      <>
        <h1 className={t.headingXl}>{schema.title}</h1>
        {schema.sections.map((section) => (
          <Fragment key={section.id}>
            <h2 className={t.headingM}>{section.title}</h2>
            <c.TaskList tasks={toEntries(section.tasks, applicationId, parent, schema)} />
          </Fragment>
        ))}
        {footer}
      </>
    );
  }

  const entries = toEntries(schema.tasks ?? [], applicationId, parent, schema);
  return (
    <>
      <h1 className={t.headingL}>{schema.title}</h1>
      <c.TaskList tasks={entries} />
      {footer}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page state loader — pair with TaskListRenderer in the consumer's page.tsx.
// ---------------------------------------------------------------------------

export type TaskListPageState = {
  schema: TaskListSchema;
  parent: ParentState;
};

export async function loadTaskListPageState(
  applicationId: string,
): Promise<TaskListPageState> {
  const schemaBlob = await readBlob<TaskListSchema>(
    BLOB_PATHS.taskListSchema(applicationId),
  );
  const { state } = await loadOrInitParent(applicationId);
  return { schema: schemaBlob.data, parent: state };
}
