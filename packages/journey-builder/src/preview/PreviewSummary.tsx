/**
 * Static preview of a `SummarySchema`. Shows headerRows and (when an
 * `entries` block is configured) renders mock entries grouped by index,
 * exactly as `SummaryRenderer` would. Mock entries are passed in by the
 * parent — the preview pane sets up a few defaults so BAs can see the
 * looping shape with N=0, 1, 2 entries.
 */

import { useSkinClass } from './skin';
import type { SummaryEntriesBlock, SummarySchema } from '../schema';

export type MockEntries = Array<{
  /** answers shape: `formId → fieldId → string` */
  answers: Record<string, Record<string, string>>;
}>;

export function PreviewSummary({
  schema,
  mockAnswers = {},
  mockEntries = [],
  onContinue,
  onAddAnother,
  onChangeRow,
}: {
  schema: SummarySchema;
  /** Per-form answers in the *parent journey* (used to resolve headerRows + showWhen). */
  mockAnswers?: Record<string, Record<string, string>>;
  /** Entries of the looping child journey referenced by `schema.entries.fromJourneyId`. */
  mockEntries?: MockEntries;
  /** Walkthrough mode: the continue button follows `schema.next`. */
  onContinue?: () => void;
  /** Walkthrough mode: the add-another link starts a new looping entry. */
  onAddAnother?: () => void;
  /** Walkthrough mode: header-row Change links jump to the source form. */
  onChangeRow?: (formId: string) => void;
}) {
  const s = useSkinClass();
  const entriesBlock = schema.entries;
  const entriesVisible =
    entriesBlock && (entriesBlock.showWhen ? checkShowWhen(entriesBlock, mockAnswers) : true);

  return (
    <div>
      {schema.caption ? <span className={s('govuk-caption-l')}>{schema.caption}</span> : null}
      <h1 className={s('govuk-heading-l')}>{schema.title}</h1>
      {schema.description ? <p className={s('govuk-body')}>{schema.description}</p> : null}

      {schema.headerRows && schema.headerRows.length > 0 ? (
        <dl className={s('govuk-summary-list')}>
          {schema.headerRows.map((r, i) => {
            const v = resolve(mockAnswers, r.valueFrom);
            const sourceFormId = r.valueFrom.split('.')[0];
            return (
              <div key={i} className={s('govuk-summary-list__row')}>
                <dt className={s('govuk-summary-list__key')}>{r.key}</dt>
                <dd className={s('govuk-summary-list__value')}>{v ?? ''}</dd>
                <dd className={s('govuk-summary-list__actions')}>
                  <a
                    className={s('govuk-link')}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (sourceFormId) onChangeRow?.(sourceFormId);
                    }}
                  >
                    Change
                  </a>
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {entriesBlock && entriesVisible
        ? mockEntries.map((entry, idx) => (
            <div key={idx}>
              <h2 className={s('govuk-heading-m')} style={{ marginTop: '1.5rem' }}>
                {entriesBlock.groupLabel.replace('{n}', String(idx + 1))}
                {mockEntries.length > 1 && entriesBlock.removeLabel ? (
                  <a
                    className={s('govuk-link')}
                    style={{ float: 'right', fontWeight: 400, fontSize: '1rem' }}
                    href="#"
                  >
                    {entriesBlock.removeLabel}
                  </a>
                ) : null}
              </h2>
              <dl className={s('govuk-summary-list')}>
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
                    <div key={i} className={s('govuk-summary-list__row')}>
                      <dt className={s('govuk-summary-list__key')}>{row.key}</dt>
                      <dd className={s('govuk-summary-list__value')}>{text}</dd>
                      <dd className={s('govuk-summary-list__actions')}>
                        <a className={s('govuk-link')} href="#">Change</a>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))
        : null}

      {entriesBlock && entriesVisible ? (
        <p className={s('govuk-body')} style={{ marginTop: '1.5rem' }}>
          <a
            className={s('govuk-link')}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onAddAnother?.();
            }}
          >
            {entriesBlock.addAnotherLabel}
          </a>
        </p>
      ) : null}

      <button
        className={s('govuk-button')}
        type="button"
        data-module="govuk-button"
        onClick={onContinue}
      >
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
