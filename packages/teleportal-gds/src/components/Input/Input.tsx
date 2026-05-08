import type { ReactElement } from 'react';

/**
 * GovUK Design System "Text input" wrapper. Renders the documented
 * markup (govuk-form-group + govuk-label + optional govuk-hint +
 * optional govuk-error-message + govuk-input) with the right ARIA
 * wiring for hint and error ids.
 *
 * Server-Component-safe: no client hooks. Forms post to a Server
 * Action; the rendered `defaultValue` round-trips the previously
 * submitted value.
 */
export type InputProps = {
  id: string;
  /** HTML name attribute. Defaults to `id`. */
  name?: string;
  label: string;
  hint?: string;
  inputType?: 'text' | 'email' | 'number' | 'tel' | 'url' | 'password';
  autocomplete?: string;
  defaultValue?: string;
  /** Inline error message; toggles error styling on the form group + input. */
  error?: string;
  required?: boolean;
};

export function Input(props: InputProps): ReactElement {
  const {
    id,
    name = id,
    label,
    hint,
    inputType = 'text',
    autocomplete,
    defaultValue,
    error,
    required,
  } = props;

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`govuk-form-group${error ? ' govuk-form-group--error' : ''}`}>
      <label className="govuk-label" htmlFor={id}>
        {label}
      </label>
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
      <input
        className={`govuk-input${error ? ' govuk-input--error' : ''}`}
        id={id}
        name={name}
        type={inputType}
        defaultValue={defaultValue}
        autoComplete={autocomplete}
        aria-describedby={describedBy}
        aria-required={required ? true : undefined}
      />
    </div>
  );
}
