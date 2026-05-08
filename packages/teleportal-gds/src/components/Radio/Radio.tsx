import { Fragment, type ReactElement, type ReactNode } from 'react';

export type RadioOption = {
  value: string;
  label: string;
  hint?: string;
  /**
   * Pre-rendered conditional content shown when this option is selected.
   * The GovUK frontend JS toggles visibility based on radio state — make
   * sure `<GovukInit />` is mounted somewhere on the page.
   */
  conditional?: ReactNode;
};

export type RadioProps = {
  id: string;
  name?: string;
  label: string;
  hint?: string;
  options: RadioOption[];
  defaultValue?: string;
  error?: string;
  required?: boolean;
};

/**
 * GovUK Radios. The first input gets `id={id}` so the ErrorSummary
 * anchor (`#${id}`) focuses the right element; subsequent inputs get
 * `${id}-N` suffixes per GovUK convention.
 */
export function Radio(props: RadioProps): ReactElement {
  const { id, name = id, label, hint, options, defaultValue, error, required } = props;

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`govuk-form-group${error ? ' govuk-form-group--error' : ''}`}>
      <fieldset className="govuk-fieldset" aria-describedby={describedBy}>
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
        <div className="govuk-radios" data-module="govuk-radios">
          {options.map((opt, index) => {
            const inputId = index === 0 ? id : `${id}-${index + 1}`;
            const optHintId = opt.hint ? `${inputId}-item-hint` : undefined;
            const conditionalId = opt.conditional ? `${inputId}-conditional` : undefined;
            const isChecked = defaultValue === opt.value;
            return (
              <Fragment key={opt.value}>
                <div className="govuk-radios__item">
                  <input
                    className="govuk-radios__input"
                    id={inputId}
                    name={name}
                    type="radio"
                    value={opt.value}
                    defaultChecked={isChecked}
                    aria-describedby={optHintId}
                    aria-required={required ? true : undefined}
                    data-aria-controls={conditionalId}
                  />
                  <label className="govuk-label govuk-radios__label" htmlFor={inputId}>
                    {opt.label}
                  </label>
                  {opt.hint ? (
                    <div id={optHintId} className="govuk-hint govuk-radios__hint">
                      {opt.hint}
                    </div>
                  ) : null}
                </div>
                {opt.conditional ? (
                  <div
                    className={`govuk-radios__conditional${
                      isChecked ? '' : ' govuk-radios__conditional--hidden'
                    }`}
                    id={conditionalId}
                  >
                    {opt.conditional}
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
