import type { ReactElement } from 'react';

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = {
  id: string;
  name?: string;
  label: string;
  hint?: string;
  options: SelectOption[];
  /** Renders an empty leading option (e.g. "Choose…"). */
  placeholder?: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
};

export function Select(props: SelectProps): ReactElement {
  const {
    id,
    name = id,
    label,
    hint,
    options,
    placeholder,
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
      <select
        className={`govuk-select${error ? ' govuk-select--error' : ''}`}
        id={id}
        name={name}
        defaultValue={defaultValue ?? (placeholder !== undefined ? '' : undefined)}
        aria-describedby={describedBy}
        aria-required={required ? true : undefined}
      >
        {placeholder !== undefined ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
