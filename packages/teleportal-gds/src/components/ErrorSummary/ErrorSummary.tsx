import type { ReactElement } from 'react';

export type ErrorSummaryItem = {
  /** Field id the link should focus on click — matches the wrapper component's id. */
  fieldId: string;
  message: string;
};

export type ErrorSummaryProps = {
  title?: string;
  errors: ErrorSummaryItem[];
};

/**
 * GovUK Error Summary. Render at the top of a page whenever validation
 * fails so users can navigate to each broken field. Anchors point to
 * `#${fieldId}` — wrappers expose that id on a focusable element.
 */
export function ErrorSummary(props: ErrorSummaryProps): ReactElement | null {
  const { title = 'There is a problem', errors } = props;
  if (errors.length === 0) return null;

  return (
    <div className="govuk-error-summary" data-module="govuk-error-summary">
      <div role="alert">
        <h2 className="govuk-error-summary__title">{title}</h2>
        <div className="govuk-error-summary__body">
          <ul className="govuk-list govuk-error-summary__list">
            {errors.map((e) => (
              <li key={e.fieldId}>
                <a href={`#${e.fieldId}`}>{e.message}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
