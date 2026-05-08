import type { ReactElement } from 'react';

export type DatePickerProps = {
  id: string;
  /**
   * Base name. Renders three inputs at `${name}-day`, `${name}-month`,
   * `${name}-year`; request.utils.formDataToAnswers recombines them
   * into a single ISO YYYY-MM-DD string keyed by `id`.
   */
  name?: string;
  label: string;
  hint?: string;
  /** ISO YYYY-MM-DD; split into day/month/year for the three inputs. */
  defaultValue?: string;
  error?: string;
  required?: boolean;
};

function splitIsoDate(iso?: string): { day: string; month: string; year: string } {
  if (!iso) return { day: '', month: '', year: '' };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { day: '', month: '', year: '' };
  return { year: m[1] ?? '', month: m[2] ?? '', day: m[3] ?? '' };
}

export function DatePicker(props: DatePickerProps): ReactElement {
  const { id, name = id, label, hint, defaultValue, error, required } = props;
  const { day, month, year } = splitIsoDate(defaultValue);

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const inputCls = `govuk-input govuk-date-input__input${error ? ' govuk-input--error' : ''}`;

  return (
    <div className={`govuk-form-group${error ? ' govuk-form-group--error' : ''}`}>
      <fieldset
        className="govuk-fieldset"
        role="group"
        id={id}
        tabIndex={-1}
        aria-describedby={describedBy}
        aria-required={required ? true : undefined}
      >
        <legend className="govuk-fieldset__legend govuk-fieldset__legend--m">{label}</legend>
        {hint ? (
          <div id={hintId} className="govuk-hint">
            {hint}
          </div>
        ) : null}
        {error ? (
          <p id={errorId} className="govuk-error-message">
            <span className="govuk-visually-hidden">Error:</span> {error}
          </p>
        ) : null}
        <div className="govuk-date-input">
          <div className="govuk-date-input__item">
            <div className="govuk-form-group">
              <label
                className="govuk-label govuk-date-input__label"
                htmlFor={`${id}-day`}
              >
                Day
              </label>
              <input
                className={`${inputCls} govuk-input--width-2`}
                id={`${id}-day`}
                name={`${name}-day`}
                type="text"
                inputMode="numeric"
                defaultValue={day}
              />
            </div>
          </div>
          <div className="govuk-date-input__item">
            <div className="govuk-form-group">
              <label
                className="govuk-label govuk-date-input__label"
                htmlFor={`${id}-month`}
              >
                Month
              </label>
              <input
                className={`${inputCls} govuk-input--width-2`}
                id={`${id}-month`}
                name={`${name}-month`}
                type="text"
                inputMode="numeric"
                defaultValue={month}
              />
            </div>
          </div>
          <div className="govuk-date-input__item">
            <div className="govuk-form-group">
              <label
                className="govuk-label govuk-date-input__label"
                htmlFor={`${id}-year`}
              >
                Year
              </label>
              <input
                className={`${inputCls} govuk-input--width-4`}
                id={`${id}-year`}
                name={`${name}-year`}
                type="text"
                inputMode="numeric"
                defaultValue={year}
              />
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
