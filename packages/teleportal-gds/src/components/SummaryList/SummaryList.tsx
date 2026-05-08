import type { ReactElement, ReactNode } from 'react';

export type SummaryListAction = {
  href: string;
  /** Visible link text — usually "Change" or "Remove". */
  text: string;
  /**
   * Visually-hidden suffix appended to the link, so screen-reader users
   * hear "Change name" rather than "Change". Defaults to the row key.
   */
  visuallyHiddenText?: string;
};

export type SummaryListRow = {
  key: string;
  value: ReactNode;
  action?: SummaryListAction;
};

export type SummaryListProps = {
  rows: SummaryListRow[];
};

export function SummaryList(props: SummaryListProps): ReactElement {
  const { rows } = props;
  return (
    <dl className="govuk-summary-list">
      {rows.map((row, idx) => (
        <div key={idx} className="govuk-summary-list__row">
          <dt className="govuk-summary-list__key">{row.key}</dt>
          <dd className="govuk-summary-list__value">{row.value}</dd>
          {row.action ? (
            <dd className="govuk-summary-list__actions">
              <a className="govuk-link" href={row.action.href}>
                {row.action.text}
                <span className="govuk-visually-hidden">
                  {' '}
                  {row.action.visuallyHiddenText ?? row.key}
                </span>
              </a>
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
