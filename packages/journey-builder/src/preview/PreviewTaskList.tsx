/**
 * Static preview of a `TaskListJourneyPage` or master `TaskListSchema`.
 * Renders sections + tasks with status tags using the GovUK task-list
 * pattern. Tasks aren't navigable in the preview — it's structural.
 */

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
}: {
  source: TaskListJourneyPage | TaskListSchema;
  isMaster?: boolean;
}) {
  return (
    <div>
      {(source as TaskListJourneyPage).caption ? (
        <span className="govuk-caption-l">
          {(source as TaskListJourneyPage).caption}
        </span>
      ) : null}
      <h1 className={isMaster ? 'govuk-heading-xl' : 'govuk-heading-l'}>
        {source.title}
      </h1>
      {(source as TaskListJourneyPage).description ? (
        <p className="govuk-body">{(source as TaskListJourneyPage).description}</p>
      ) : null}

      {source.sections && source.sections.length > 0 ? (
        source.sections.map((section) => (
          <div key={section.id}>
            <h2 className="govuk-heading-m">{section.title}</h2>
            <TaskRows tasks={section.tasks} />
          </div>
        ))
      ) : (
        <TaskRows tasks={source.tasks ?? []} />
      )}

      {source.footerActions && source.footerActions.length > 0 ? (
        <div className="govuk-button-group">
          {source.footerActions.map((a) => (
            <button
              key={a.actionId}
              type="button"
              className={`govuk-button${a.variant === 'secondary' ? ' govuk-button--secondary' : a.variant === 'warning' ? ' govuk-button--warning' : ''}`}
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

function TaskRows({ tasks }: { tasks: TaskListItem[] }) {
  if (tasks.length === 0) {
    return <p className="govuk-body">(no tasks)</p>;
  }
  return (
    <ul className="govuk-task-list">
      {tasks.map((task) => {
        const tagClass = STATUS_TAG_CLASS[task.status];
        const statusText = task.statusLabel ?? STATUS_LABEL[task.status];
        return (
          <li key={task.id} className="govuk-task-list__item govuk-task-list__item--with-link">
            <div className="govuk-task-list__name-and-hint">
              <a className="govuk-link govuk-task-list__link" href="#">
                {task.label}
              </a>
            </div>
            <div className="govuk-task-list__status">
              {tagClass ? (
                <strong className={tagClass}>{statusText}</strong>
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
