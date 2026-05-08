import { Fragment, type ReactElement, type ReactNode } from 'react';

export type CheckboxOption = {
  value: string;
  label: string;
  hint?: string;
  /**
   * Pre-rendered conditional content shown when this option is checked.
   * The GovUK frontend JS toggles visibility — mount `<GovukInit />` to
   * make the show/hide actually fire.
   */
  conditional?: ReactNode;
};

export type CheckboxProps = {
  id: string;
  name?: string;
  label: string;
  hint?: string;
  options: CheckboxOption[];
  /** Pre-checked values. Multi-select: any matching option starts checked. */
  defaultValues?: string[];
  error?: string;
  required?: boolean;
};

export function Checkbox(props: CheckboxProps): ReactElement {
  const {
    id,
    name = id,
    label,
    hint,
    options,
    defaultValues = [],
    error,
    required,
  } = props;

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
        <div className="govuk-checkboxes" data-module="govuk-checkboxes">
          {options.map((opt, index) => {
            const inputId = index === 0 ? id : `${id}-${index + 1}`;
            const optHintId = opt.hint ? `${inputId}-item-hint` : undefined;
            const conditionalId = opt.conditional ? `${inputId}-conditional` : undefined;
            const isChecked = defaultValues.includes(opt.value);
            return (
              <Fragment key={opt.value}>
                <div className="govuk-checkboxes__item">
                  <input
                    className="govuk-checkboxes__input"
                    id={inputId}
                    name={name}
                    type="checkbox"
                    value={opt.value}
                    defaultChecked={isChecked}
                    aria-describedby={optHintId}
                    aria-required={required ? true : undefined}
                    data-aria-controls={conditionalId}
                  />
                  <label className="govuk-label govuk-checkboxes__label" htmlFor={inputId}>
                    {opt.label}
                  </label>
                  {opt.hint ? (
                    <div id={optHintId} className="govuk-hint govuk-checkboxes__hint">
                      {opt.hint}
                    </div>
                  ) : null}
                </div>
                {opt.conditional ? (
                  <div
                    className={`govuk-checkboxes__conditional${
                      isChecked ? '' : ' govuk-checkboxes__conditional--hidden'
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
