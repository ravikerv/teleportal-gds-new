/**
 * Static preview of a `TaskListJourneyPage` or master `TaskListSchema`.
 * Renders sections + tasks with status tags using the GovUK task-list
 * pattern. Tasks aren't navigable in the preview — it's structural.
 */

import { useSkinClass } from './skin';
import type {
  TaskListItem,
  TaskListJourneyPage,
  TaskListSchema,
  TaskStatus,
} from '../schema';

const STATUS_TAG_CLASS: Partial<Record<TaskStatus, string>> = {
  'not-started': 'govuk-tag govuk-tag--blue',
  'in-progress': 'govuk-tag govuk-tag--light-blue',
  'cannot-start': 'govuk-tag govuk-tag--grey',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  'not-started': 'Not yet started',
  'in-progress': 'In progress',
  completed: 'Completed',
  'cannot-start': 'Cannot start yet',
};

export function PreviewTaskList({
  source,
  isMaster = false,
  onTaskClick,
  statusOf,
}: {
  source: TaskListJourneyPage | TaskListSchema;
  isMaster?: boolean;
  /** Walkthrough mode: task links navigate. Omitted → decorative. */
  onTaskClick?: (task: TaskListItem) => void;
  /** Walkthrough mode: override a task's displayed status (e.g. completed). */
  statusOf?: (task: TaskListItem) => TaskStatus;
}) {
  const s = useSkinClass();
  return (
    <div>
      {(source as TaskListJourneyPage).caption ? (
        <span className={s('govuk-caption-l')}>
          {(source as TaskListJourneyPage).caption}
        </span>
      ) : null}
      <h1 className={s(isMaster ? 'govuk-heading-xl' : 'govuk-heading-l')}>
        {source.title}
      </h1>
      {(source as TaskListJourneyPage).description ? (
        <p className={s('govuk-body')}>{(source as TaskListJourneyPage).description}</p>
      ) : null}

      {source.sections && source.sections.length > 0 ? (
        source.sections.map((section) => (
          <div key={section.id}>
            <h2 className={s('govuk-heading-m')}>{section.title}</h2>
            <TaskRows tasks={section.tasks} onTaskClick={onTaskClick} statusOf={statusOf} />
          </div>
        ))
      ) : (
        <TaskRows tasks={source.tasks ?? []} onTaskClick={onTaskClick} statusOf={statusOf} />
      )}

      {source.footerActions && source.footerActions.length > 0 ? (
        <div className={s('govuk-button-group')}>
          {source.footerActions.map((a) => (
            <button
              key={a.actionId}
              type="button"
              className={s(`govuk-button${a.variant === 'secondary' ? ' govuk-button--secondary' : a.variant === 'warning' ? ' govuk-button--warning' : ''}`)}
              data-module="govuk-button"
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TaskRows({
  tasks,
  onTaskClick,
  statusOf,
}: {
  tasks: TaskListItem[];
  onTaskClick?: (task: TaskListItem) => void;
  statusOf?: (task: TaskListItem) => TaskStatus;
}) {
  const s = useSkinClass();
  if (tasks.length === 0) {
    return <p className={s('govuk-body')}>(no tasks)</p>;
  }
  return (
    <ul className={s('govuk-task-list')}>
      {tasks.map((task) => {
        const status = statusOf?.(task) ?? task.status;
        const tagClass = STATUS_TAG_CLASS[status];
        const statusText =
          statusOf && status !== task.status
            ? STATUS_LABEL[status]
            : task.statusLabel ?? STATUS_LABEL[status];
        return (
          <li key={task.id} className={s('govuk-task-list__item govuk-task-list__item--with-link')}>
            <div className={s('govuk-task-list__name-and-hint')}>
              <a
                className={s('govuk-link govuk-task-list__link')}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onTaskClick?.(task);
                }}
              >
                {task.label}
              </a>
            </div>
            <div className={s('govuk-task-list__status')}>
              {tagClass ? (
                <strong className={s(tagClass)}>{statusText}</strong>
              ) : (
                statusText
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
