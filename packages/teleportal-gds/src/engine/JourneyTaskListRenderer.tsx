/**
 * Renders a TaskListJourneyPage at the journey root. Shape mirrors the
 * master TaskListRenderer (sections + tasks + footer actions) but lives
 * inside a journey's form-schemas.json, so a journey can host its own
 * sub-task list (e.g. "Activity checklist" under the activities journey).
 */

import { Fragment, type ReactElement } from 'react';

import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { TaskList, type TaskListEntry } from '../components/TaskList';
import type { ParentState } from '../shared/types/journey.types';
import type {
  TaskListFooterAction,
  TaskListItem,
  TaskListJourneyPage,
} from '../shared/types/schema.types';
import { computeTaskStatus } from '../shared/utils/data.utils';
import {
  resolveBackPath,
  resolveJourneyEntryPath,
} from '../shared/utils/navigation.utils';
import { taskListFooterAction } from './formActions';

export type JourneyTaskListRendererProps = {
  applicationId: string;
  journeyId: string;
  schema: TaskListJourneyPage;
  parent: ParentState;
};

function toEntries(
  tasks: TaskListItem[],
  applicationId: string,
  parent: ParentState,
  schema: TaskListJourneyPage,
): TaskListEntry[] {
  // computeTaskStatus reads the parent state for runtime status; the second
  // arg's `tasks`/`sections` are only used for dependsOn lookups — pass the
  // schema as-is, which it already understands (TaskListSchema-shaped).
  return tasks.map((task) => {
    const status = computeTaskStatus(task, parent, {
      title: schema.title,
      ...(schema.tasks ? { tasks: schema.tasks } : {}),
      ...(schema.sections ? { sections: schema.sections } : {}),
    });
    const journeyId = task.type === 'nested-journey' ? task.journeyRef : task.id;
    const href = resolveJourneyEntryPath(applicationId, journeyId);
    const entry: TaskListEntry = {
      id: task.id,
      label: task.label,
      status,
      href,
    };
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
  return (
    <div className="govuk-button-group">
      {actions.map((a) => {
        const action = taskListFooterAction.bind(
          null,
          applicationId,
          a.actionId,
          a.redirectTo ?? '/',
        );
        return (
          <form key={a.actionId} action={action}>
            <Button type="submit" variant={a.variant ?? 'primary'}>
              {a.label}
            </Button>
          </form>
        );
      })}
    </div>
  );
}

export function JourneyTaskListRenderer(
  props: JourneyTaskListRendererProps,
): ReactElement {
  const { applicationId, journeyId, schema, parent } = props;
  const backHref = schema.back
    ? resolveBackPath(applicationId, journeyId, schema.back)
    : null;
  const footer = (
    <FooterActions
      applicationId={applicationId}
      actions={schema.footerActions ?? []}
    />
  );

  if (schema.sections && schema.sections.length > 0) {
    return (
      <>
        {backHref ? <BackLink href={backHref}>Back</BackLink> : null}
        {schema.caption ? (
          <span className="govuk-caption-l">{schema.caption}</span>
        ) : null}
        <h1 className="govuk-heading-l">{schema.title}</h1>
        {schema.description ? (
          <p className="govuk-body">{schema.description}</p>
        ) : null}
        {schema.sections.map((section) => (
          <Fragment key={section.id}>
            <h2 className="govuk-heading-m">{section.title}</h2>
            <TaskList tasks={toEntries(section.tasks, applicationId, parent, schema)} />
          </Fragment>
        ))}
        {footer}
      </>
    );
  }

  const entries = toEntries(schema.tasks ?? [], applicationId, parent, schema);
  return (
    <>
      {backHref ? <BackLink href={backHref}>Back</BackLink> : null}
      {schema.caption ? (
        <span className="govuk-caption-l">{schema.caption}</span>
      ) : null}
      <h1 className="govuk-heading-l">{schema.title}</h1>
      {schema.description ? (
        <p className="govuk-body">{schema.description}</p>
      ) : null}
      <TaskList tasks={entries} />
      {footer}
    </>
  );
}
