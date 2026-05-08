import type { ReactElement } from 'react';

export type TextAreaProps = {
  id: string;
  name?: string;
  label: string;
  hint?: string;
  rows?: number;
  defaultValue?: string;
  error?: string;
  required?: boolean;
};

export function TextArea(props: TextAreaProps): ReactElement {
  const {
    id,
    name = id,
    label,
    hint,
    rows = 5,
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
      <textarea
        className={`govuk-textarea${error ? ' govuk-textarea--error' : ''}`}
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        aria-describedby={describedBy}
        aria-required={required ? true : undefined}
      />
    </div>
  );
}
