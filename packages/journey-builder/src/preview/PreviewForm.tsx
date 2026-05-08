/**
 * Static preview of a `FormPage` using govuk-frontend classes directly.
 * No teleportal-gds runtime imports — the engine renderers are coupled
 * to next/navigation and server actions, so we mimic their structural
 * output here for fidelity without the runtime cost.
 *
 * Mock answers come from `mockAnswers[fieldId]`; missing values render
 * with empty defaults. The submit button is decorative.
 */

import type { FormField, FormPage } from '../schema';

export function PreviewForm({
  page,
  mockAnswers = {},
}: {
  page: FormPage;
  mockAnswers?: Record<string, string | string[]>;
}) {
  return (
    <form noValidate onSubmit={(e) => e.preventDefault()}>
      {page.caption ? <span className="govuk-caption-l">{page.caption}</span> : null}
      <h1 className="govuk-heading-l">{page.title}</h1>
      {page.description ? (
        <p className="govuk-body" style={{ whiteSpace: 'pre-line' }}>
          {page.description}
        </p>
      ) : null}
      {page.fields.map((field) => (
        <FieldPreview key={field.id} field={field} mockAnswers={mockAnswers} />
      ))}
      <button type="button" className="govuk-button" data-module="govuk-button">
        {page.submitLabel ?? 'Save and continue'}
      </button>
    </form>
  );
}

function FieldPreview({
  field,
  mockAnswers,
}: {
  field: FormField;
  mockAnswers: Record<string, string | string[]>;
}) {
  const value = mockAnswers[field.id];
  switch (field.type) {
    case 'input':
      return (
        <div className="govuk-form-group">
          <label className="govuk-label" htmlFor={field.id}>
            {field.label}
          </label>
          {field.hint ? (
            <div className="govuk-hint" id={`${field.id}-hint`}>
              {field.hint}
            </div>
          ) : null}
          <input
            className="govuk-input"
            id={field.id}
            name={field.id}
            type={field.inputType ?? 'text'}
            defaultValue={typeof value === 'string' ? value : ''}
          />
        </div>
      );
    case 'textarea':
      return (
        <div className="govuk-form-group">
          <label className="govuk-label" htmlFor={field.id}>
            {field.label}
          </label>
          {field.hint ? (
            <div className="govuk-hint" id={`${field.id}-hint`}>
              {field.hint}
            </div>
          ) : null}
          <textarea
            className="govuk-textarea"
            id={field.id}
            name={field.id}
            rows={field.rows ?? 5}
            defaultValue={typeof value === 'string' ? value : ''}
          />
        </div>
      );
    case 'datepicker':
      return (
        <div className="govuk-form-group">
          <label className="govuk-label" htmlFor={field.id}>
            {field.label}
          </label>
          {field.hint ? (
            <div className="govuk-hint" id={`${field.id}-hint`}>
              {field.hint}
            </div>
          ) : null}
          <input
            className="govuk-input govuk-input--width-10"
            id={field.id}
            name={field.id}
            type="date"
            defaultValue={typeof value === 'string' ? value : ''}
          />
        </div>
      );
    case 'select':
      return (
        <div className="govuk-form-group">
          <label className="govuk-label" htmlFor={field.id}>
            {field.label}
          </label>
          <select
            className="govuk-select"
            id={field.id}
            name={field.id}
            defaultValue={typeof value === 'string' ? value : ''}
          >
            {field.placeholder ? <option value="">{field.placeholder}</option> : null}
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            )) ?? (
              <option value="">(options resolved at runtime via dataSource)</option>
            )}
          </select>
        </div>
      );
    case 'radio':
      return (
        <div className="govuk-form-group">
          <fieldset className="govuk-fieldset">
            <legend className="govuk-fieldset__legend govuk-fieldset__legend--m">
              {field.label}
            </legend>
            {field.hint ? (
              <div className="govuk-hint" id={`${field.id}-hint`}>
                {field.hint}
              </div>
            ) : null}
            <div className="govuk-radios" data-module="govuk-radios">
              {field.options.map((opt, i) => (
                <div key={opt.value} className="govuk-radios__item">
                  <input
                    className="govuk-radios__input"
                    id={`${field.id}-${i}`}
                    name={field.id}
                    type="radio"
                    value={opt.value}
                    defaultChecked={value === opt.value}
                  />
                  <label className="govuk-label govuk-radios__label" htmlFor={`${field.id}-${i}`}>
                    {opt.label}
                  </label>
                  {opt.hint ? (
                    <div className="govuk-hint govuk-radios__hint">{opt.hint}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </fieldset>
        </div>
      );
    case 'checkbox': {
      const arr = Array.isArray(value) ? value : [];
      return (
        <div className="govuk-form-group">
          <fieldset className="govuk-fieldset">
            <legend className="govuk-fieldset__legend govuk-fieldset__legend--m">
              {field.label}
            </legend>
            <div className="govuk-checkboxes" data-module="govuk-checkboxes">
              {field.options.map((opt, i) => (
                <div key={opt.value} className="govuk-checkboxes__item">
                  <input
                    className="govuk-checkboxes__input"
                    id={`${field.id}-${i}`}
                    name={field.id}
                    type="checkbox"
                    value={opt.value}
                    defaultChecked={arr.includes(opt.value)}
                  />
                  <label className="govuk-label govuk-checkboxes__label" htmlFor={`${field.id}-${i}`}>
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
      );
    }
  }
}
