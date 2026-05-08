import type { ReactElement } from 'react';

import type { TaskStatus } from '../../shared/types/schema.types';

export type TaskListEntry = {
  id: string;
  label: string;
  hint?: string;
  status: TaskStatus;
  /** Omit when status is `cannot-start` — renders as plain text instead of a link. */
  href?: string;
  /** Override the displayed status text; tag style still follows `status`. */
  statusLabel?: string;
};

export type TaskListProps = {
  tasks: TaskListEntry[];
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  'not-started': 'Not yet started',
  'in-progress': 'In progress',
  completed: 'Completed',
  'cannot-start': 'Cannot start yet',
};

const STATUS_TAG_CLASS: Partial<Record<TaskStatus, string>> = {
  'not-started': 'govuk-tag govuk-tag--blue',
  'in-progress': 'govuk-tag govuk-tag--light-blue',
  'cannot-start': 'govuk-tag govuk-tag--grey',
  // 'completed' renders as plain text per GovUK pattern.
};

export function TaskList(props: TaskListProps): ReactElement {
  const { tasks } = props;
  return (
    <ul className="govuk-task-list">
      {tasks.map((task) => {
        const statusId = `${task.id}-status`;
        const hintId = task.hint ? `${task.id}-hint` : undefined;
        const tagClass = STATUS_TAG_CLASS[task.status];
        const showAsLink = task.status !== 'cannot-start' && task.href !== undefined;
        const itemCls = `govuk-task-list__item${
          showAsLink ? ' govuk-task-list__item--with-link' : ''
        }`;

        return (
          <li key={task.id} className={itemCls}>
            <div className="govuk-task-list__name-and-hint">
              {showAsLink ? (
                <a
                  className="govuk-link govuk-task-list__link"
                  href={task.href}
                  aria-describedby={[hintId, statusId].filter(Boolean).join(' ')}
                >
                  {task.label}
                </a>
              ) : (
                <div>{task.label}</div>
              )}
              {task.hint ? (
                <div id={hintId} className="govuk-task-list__hint">
                  {task.hint}
                </div>
              ) : null}
            </div>
            <div className="govuk-task-list__status" id={statusId}>
              {tagClass ? (
                <strong className={tagClass}>{task.statusLabel ?? STATUS_LABEL[task.status]}</strong>
              ) : (
                task.statusLabel ?? STATUS_LABEL[task.status]
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
