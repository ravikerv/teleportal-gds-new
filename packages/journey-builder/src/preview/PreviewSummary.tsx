/**
 * Static preview of a `SummarySchema`. Shows headerRows and (when an
 * `entries` block is configured) renders mock entries grouped by index,
 * exactly as `SummaryRenderer` would. Mock entries are passed in by the
 * parent — the preview pane sets up a few defaults so BAs can see the
 * looping shape with N=0, 1, 2 entries.
 */

import type { SummaryEntriesBlock, SummarySchema } from '../schema';

export type MockEntries = Array<{
  /** answers shape: `formId → fieldId → string` */
  answers: Record<string, Record<string, string>>;
}>;

export function PreviewSummary({
  schema,
  mockAnswers = {},
  mockEntries = [],
}: {
  schema: SummarySchema;
  /** Per-form answers in the *parent journey* (used to resolve headerRows + showWhen). */
  mockAnswers?: Record<string, Record<string, string>>;
  /** Entries of the looping child journey referenced by `schema.entries.fromJourneyId`. */
  mockEntries?: MockEntries;
}) {
  const entriesBlock = schema.entries;
  const entriesVisible =
    entriesBlock && (entriesBlock.showWhen ? checkShowWhen(entriesBlock, mockAnswers) : true);

  return (
    <div>
      {schema.caption ? <span className="govuk-caption-l">{schema.caption}</span> : null}
      <h1 className="govuk-heading-l">{schema.title}</h1>
      {schema.description ? <p className="govuk-body">{schema.description}</p> : null}

      {schema.headerRows && schema.headerRows.length > 0 ? (
        <dl className="govuk-summary-list">
          {schema.headerRows.map((r, i) => {
            const v = resolve(mockAnswers, r.valueFrom);
            return (
              <div key={i} className="govuk-summary-list__row">
                <dt className="govuk-summary-list__key">{r.key}</dt>
                <dd className="govuk-summary-list__value">{v ?? ''}</dd>
                <dd className="govuk-summary-list__actions">
                  <a className="govuk-link" href="#">Change</a>
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {entriesBlock && entriesVisible
        ? mockEntries.map((entry, idx) => (
            <div key={idx}>
              <h2 className="govuk-heading-m" style={{ marginTop: '1.5rem' }}>
                {entriesBlock.groupLabel.replace('{n}', String(idx + 1))}
                {mockEntries.length > 1 && entriesBlock.removeLabel ? (
                  <a
                    className="govuk-link"
                    style={{ float: 'right', fontWeight: 400, fontSize: '1rem' }}
                    href="#"
                  >
                    {entriesBlock.removeLabel}
                  </a>
                ) : null}
              </h2>
              <dl className="govuk-summary-list">
                {entriesBlock.rows.map((row, i) => {
                  let text = '';
                  if (row.valueFromAll && row.valueFromAll.length > 0) {
                    text = row.valueFromAll
                      .map((p) => resolve(entry.answers, p))
                      .filter(Boolean)
                      .join(' ');
                  } else {
                    text = resolve(entry.answers, row.valueFrom) ?? '';
                  }
                  return (
                    <div key={i} className="govuk-summary-list__row">
                      <dt className="govuk-summary-list__key">{row.key}</dt>
                      <dd className="govuk-summary-list__value">{text}</dd>
                      <dd className="govuk-summary-list__actions">
                        <a className="govuk-link" href="#">Change</a>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))
        : null}

      {entriesBlock && entriesVisible ? (
        <p className="govuk-body" style={{ marginTop: '1.5rem' }}>
          <a className="govuk-link" href="#">{entriesBlock.addAnotherLabel}</a>
        </p>
      ) : null}

      <button className="govuk-button" type="button" data-module="govuk-button">
        {schema.submitLabel ?? 'Continue'}
      </button>
    </div>
  );
}

function checkShowWhen(
  block: SummaryEntriesBlock,
  mockAnswers: Record<string, Record<string, string>>,
): boolean {
  if (!block.showWhen) return true;
  const v = resolve(mockAnswers, block.showWhen.valueFrom);
  if (!v) return false;
  if (block.showWhen.equals !== undefined && v !== block.showWhen.equals) return false;
  return true;
}

function resolve(
  state: Record<string, Record<string, string>>,
  path: string,
): string | null {
  const [formId, fieldId] = path.split('.');
  if (!formId || !fieldId) return null;
  return state[formId]?.[fieldId] ?? null;
}
