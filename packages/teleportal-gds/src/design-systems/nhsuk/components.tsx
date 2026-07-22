/**
 * NHS.UK design system components — the reference example of a non-GOV.UK
 * adapter. Each component implements the SAME Props contract as its
 * GOV.UK wrapper counterpart but emits nhsuk-frontend markup/classes
 * (nhsuk-frontend is a govuk-frontend fork, so structures mirror closely;
 * notable differences: `nhsuk-u-visually-hidden`, `--reverse` buttons,
 * a plain `nhsuk-panel`, and no light-blue tag).
 *
 * The consuming app is responsible for loading the nhsuk-frontend CSS.
 */

import { Fragment, type ReactElement } from 'react';

import type { BackLinkProps } from '../../components/BackLink';
import type { ButtonProps } from '../../components/Button';
import type { CheckboxProps } from '../../components/Checkbox';
import type { CookieBannerProps } from '../../components/CookieBanner';
import type { DatePickerProps } from '../../components/DatePicker';
import type { ErrorSummaryProps } from '../../components/ErrorSummary';
import type { FooterProps } from '../../components/Footer';
import type { HeaderProps } from '../../components/Header';
import type { InputProps } from '../../components/Input';
import type { PanelProps } from '../../components/Panel';
import type { RadioProps } from '../../components/Radio';
import type { SelectProps } from '../../components/Select';
import type { SummaryListProps } from '../../components/SummaryList';
import type { TaskListProps } from '../../components/TaskList';
import type { TextAreaProps } from '../../components/TextArea';
import type { TaskStatus } from '../../shared/types/schema.types';

// ---------------------------------------------------------------------------
// Shared form-group scaffolding
// ---------------------------------------------------------------------------

function describedBy(...ids: (string | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}

function ErrorMessage({ id, error }: { id: string; error: string }): ReactElement {
  return (
    <p id={id} className="nhsuk-error-message">
      <span className="nhsuk-u-visually-hidden">Error:</span> {error}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Field components
// ---------------------------------------------------------------------------

export function NhsInput(props: InputProps): ReactElement {
  const { id, name = id, label, hint, inputType = 'text', autocomplete, defaultValue, error, required } = props;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`nhsuk-form-group${error ? ' nhsuk-form-group--error' : ''}`}>
      <label className="nhsuk-label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <div id={hintId} className="nhsuk-hint">
          {hint}
        </div>
      ) : null}
      {error && errorId ? <ErrorMessage id={errorId} error={error} /> : null}
      <input
        className={`nhsuk-input${error ? ' nhsuk-input--error' : ''}`}
        id={id}
        name={name}
        type={inputType}
        defaultValue={defaultValue}
        autoComplete={autocomplete}
        aria-describedby={describedBy(hintId, errorId)}
        aria-required={required ? true : undefined}
      />
    </div>
  );
}

export function NhsSelect(props: SelectProps): ReactElement {
  const { id, name = id, label, hint, options, placeholder, defaultValue, error, required } = props;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`nhsuk-form-group${error ? ' nhsuk-form-group--error' : ''}`}>
      <label className="nhsuk-label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <div id={hintId} className="nhsuk-hint">
          {hint}
        </div>
      ) : null}
      {error && errorId ? <ErrorMessage id={errorId} error={error} /> : null}
      <select
        className={`nhsuk-select${error ? ' nhsuk-select--error' : ''}`}
        id={id}
        name={name}
        defaultValue={defaultValue ?? (placeholder !== undefined ? '' : undefined)}
        aria-describedby={describedBy(hintId, errorId)}
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

export function NhsRadio(props: RadioProps): ReactElement {
  const { id, name = id, label, hint, options, defaultValue, error, required } = props;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`nhsuk-form-group${error ? ' nhsuk-form-group--error' : ''}`}>
      <fieldset className="nhsuk-fieldset" aria-describedby={describedBy(hintId, errorId)}>
        <legend className="nhsuk-fieldset__legend nhsuk-fieldset__legend--m">{label}</legend>
        {hint ? (
          <div id={hintId} className="nhsuk-hint">
            {hint}
          </div>
        ) : null}
        {error && errorId ? <ErrorMessage id={errorId} error={error} /> : null}
        <div className="nhsuk-radios" data-module="nhsuk-radios">
          {options.map((opt, index) => {
            const inputId = index === 0 ? id : `${id}-${index + 1}`;
            const optHintId = opt.hint ? `${inputId}-item-hint` : undefined;
            const conditionalId = opt.conditional ? `${inputId}-conditional` : undefined;
            const isChecked = defaultValue === opt.value;
            return (
              <Fragment key={opt.value}>
                <div className="nhsuk-radios__item">
                  <input
                    className="nhsuk-radios__input"
                    id={inputId}
                    name={name}
                    type="radio"
                    value={opt.value}
                    defaultChecked={isChecked}
                    aria-describedby={optHintId}
                    aria-required={required ? true : undefined}
                    data-aria-controls={conditionalId}
                  />
                  <label className="nhsuk-label nhsuk-radios__label" htmlFor={inputId}>
                    {opt.label}
                  </label>
                  {opt.hint ? (
                    <div id={optHintId} className="nhsuk-hint nhsuk-radios__hint">
                      {opt.hint}
                    </div>
                  ) : null}
                </div>
                {opt.conditional ? (
                  <div
                    className={`nhsuk-radios__conditional${isChecked ? '' : ' nhsuk-radios__conditional--hidden'}`}
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

export function NhsCheckbox(props: CheckboxProps): ReactElement {
  const { id, name = id, label, hint, options, defaultValues = [], error, required } = props;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`nhsuk-form-group${error ? ' nhsuk-form-group--error' : ''}`}>
      <fieldset className="nhsuk-fieldset" aria-describedby={describedBy(hintId, errorId)}>
        <legend className="nhsuk-fieldset__legend nhsuk-fieldset__legend--m">{label}</legend>
        {hint ? (
          <div id={hintId} className="nhsuk-hint">
            {hint}
          </div>
        ) : null}
        {error && errorId ? <ErrorMessage id={errorId} error={error} /> : null}
        <div className="nhsuk-checkboxes" data-module="nhsuk-checkboxes">
          {options.map((opt, index) => {
            const inputId = index === 0 ? id : `${id}-${index + 1}`;
            const optHintId = opt.hint ? `${inputId}-item-hint` : undefined;
            const conditionalId = opt.conditional ? `${inputId}-conditional` : undefined;
            const isChecked = defaultValues.includes(opt.value);
            return (
              <Fragment key={opt.value}>
                <div className="nhsuk-checkboxes__item">
                  <input
                    className="nhsuk-checkboxes__input"
                    id={inputId}
                    name={name}
                    type="checkbox"
                    value={opt.value}
                    defaultChecked={isChecked}
                    aria-describedby={optHintId}
                    aria-required={required ? true : undefined}
                    data-aria-controls={conditionalId}
                  />
                  <label className="nhsuk-label nhsuk-checkboxes__label" htmlFor={inputId}>
                    {opt.label}
                  </label>
                  {opt.hint ? (
                    <div id={optHintId} className="nhsuk-hint nhsuk-checkboxes__hint">
                      {opt.hint}
                    </div>
                  ) : null}
                </div>
                {opt.conditional ? (
                  <div
                    className={`nhsuk-checkboxes__conditional${isChecked ? '' : ' nhsuk-checkboxes__conditional--hidden'}`}
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

function splitIsoDate(iso?: string): { day: string; month: string; year: string } {
  if (!iso) return { day: '', month: '', year: '' };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { day: '', month: '', year: '' };
  return { year: m[1] ?? '', month: m[2] ?? '', day: m[3] ?? '' };
}

export function NhsDatePicker(props: DatePickerProps): ReactElement {
  const { id, name = id, label, hint, defaultValue, error, required } = props;
  const { day, month, year } = splitIsoDate(defaultValue);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const inputCls = `nhsuk-input nhsuk-date-input__input${error ? ' nhsuk-input--error' : ''}`;
  const part = (partId: string, partName: string, partLabel: string, width: string, value: string) => (
    <div className="nhsuk-date-input__item">
      <div className="nhsuk-form-group">
        <label className="nhsuk-label nhsuk-date-input__label" htmlFor={partId}>
          {partLabel}
        </label>
        <input
          className={`${inputCls} ${width}`}
          id={partId}
          name={partName}
          type="text"
          inputMode="numeric"
          defaultValue={value}
        />
      </div>
    </div>
  );
  return (
    <div className={`nhsuk-form-group${error ? ' nhsuk-form-group--error' : ''}`}>
      <fieldset
        className="nhsuk-fieldset"
        role="group"
        id={id}
        tabIndex={-1}
        aria-describedby={describedBy(hintId, errorId)}
        aria-required={required ? true : undefined}
      >
        <legend className="nhsuk-fieldset__legend nhsuk-fieldset__legend--m">{label}</legend>
        {hint ? (
          <div id={hintId} className="nhsuk-hint">
            {hint}
          </div>
        ) : null}
        {error && errorId ? <ErrorMessage id={errorId} error={error} /> : null}
        <div className="nhsuk-date-input">
          {part(`${id}-day`, `${name}-day`, 'Day', 'nhsuk-input--width-2', day)}
          {part(`${id}-month`, `${name}-month`, 'Month', 'nhsuk-input--width-2', month)}
          {part(`${id}-year`, `${name}-year`, 'Year', 'nhsuk-input--width-4', year)}
        </div>
      </fieldset>
    </div>
  );
}

export function NhsTextArea(props: TextAreaProps): ReactElement {
  const { id, name = id, label, hint, rows = 5, defaultValue, error, required } = props;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`nhsuk-form-group${error ? ' nhsuk-form-group--error' : ''}`}>
      <label className="nhsuk-label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <div id={hintId} className="nhsuk-hint">
          {hint}
        </div>
      ) : null}
      {error && errorId ? <ErrorMessage id={errorId} error={error} /> : null}
      <textarea
        className={`nhsuk-textarea${error ? ' nhsuk-textarea--error' : ''}`}
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        aria-describedby={describedBy(hintId, errorId)}
        aria-required={required ? true : undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page components
// ---------------------------------------------------------------------------

const NHS_BUTTON_VARIANT: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: '',
  secondary: ' nhsuk-button--secondary',
  warning: ' nhsuk-button--warning',
  inverse: ' nhsuk-button--reverse',
};

export function NhsButton(props: ButtonProps): ReactElement {
  const { children, type = 'submit', variant = 'primary', name, value, disabled, href } = props;
  const className = `nhsuk-button${NHS_BUTTON_VARIANT[variant]}${disabled ? ' nhsuk-button--disabled' : ''}`;
  if (href !== undefined) {
    return (
      <a
        className={className}
        href={href}
        role="button"
        draggable={false}
        data-module="nhsuk-button"
        aria-disabled={disabled ? true : undefined}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      className={className}
      type={type}
      name={name}
      value={value}
      disabled={disabled}
      aria-disabled={disabled ? true : undefined}
      data-module="nhsuk-button"
    >
      {children}
    </button>
  );
}

export function NhsBackLink(props: BackLinkProps): ReactElement {
  const { href, children = 'Back' } = props;
  return (
    <a href={href} className="nhsuk-back-link">
      {children}
    </a>
  );
}

export function NhsErrorSummary(props: ErrorSummaryProps): ReactElement | null {
  const { title = 'There is a problem', errors } = props;
  if (errors.length === 0) return null;
  return (
    <div className="nhsuk-error-summary" data-module="nhsuk-error-summary">
      <div role="alert">
        <h2 className="nhsuk-error-summary__title">{title}</h2>
        <div className="nhsuk-error-summary__body">
          <ul className="nhsuk-list nhsuk-error-summary__list">
            {errors.map((e) => (
              <li key={e.fieldId}>
                <a href={`#${e.fieldId}`}>{e.message}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function NhsSummaryList(props: SummaryListProps): ReactElement {
  const { rows } = props;
  return (
    <dl className="nhsuk-summary-list">
      {rows.map((row, idx) => (
        <div key={idx} className="nhsuk-summary-list__row">
          <dt className="nhsuk-summary-list__key">{row.key}</dt>
          <dd className="nhsuk-summary-list__value">{row.value}</dd>
          {row.action ? (
            <dd className="nhsuk-summary-list__actions">
              <a className="nhsuk-link" href={row.action.href}>
                {row.action.text}
                <span className="nhsuk-u-visually-hidden">
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

const NHS_STATUS_LABEL: Record<TaskStatus, string> = {
  'not-started': 'Not yet started',
  'in-progress': 'In progress',
  completed: 'Completed',
  'cannot-start': 'Cannot start yet',
};

const NHS_STATUS_TAG: Partial<Record<TaskStatus, string>> = {
  'not-started': 'nhsuk-tag nhsuk-tag--blue',
  'in-progress': 'nhsuk-tag nhsuk-tag--white',
  'cannot-start': 'nhsuk-tag nhsuk-tag--grey',
};

export function NhsTaskList(props: TaskListProps): ReactElement {
  const { tasks } = props;
  return (
    <ul className="nhsuk-task-list">
      {tasks.map((task) => {
        const statusId = `${task.id}-status`;
        const hintId = task.hint ? `${task.id}-hint` : undefined;
        const tagClass = NHS_STATUS_TAG[task.status];
        const showAsLink = task.status !== 'cannot-start' && task.href !== undefined;
        return (
          <li
            key={task.id}
            className={`nhsuk-task-list__item${showAsLink ? ' nhsuk-task-list__item--with-link' : ''}`}
          >
            <div className="nhsuk-task-list__name-and-hint">
              {showAsLink ? (
                <a
                  className="nhsuk-link nhsuk-task-list__link"
                  href={task.href}
                  aria-describedby={[hintId, statusId].filter(Boolean).join(' ')}
                >
                  {task.label}
                </a>
              ) : (
                <div>{task.label}</div>
              )}
              {task.hint ? (
                <div id={hintId} className="nhsuk-task-list__hint">
                  {task.hint}
                </div>
              ) : null}
            </div>
            <div className="nhsuk-task-list__status" id={statusId}>
              {tagClass ? (
                <strong className={tagClass}>
                  {task.statusLabel ?? NHS_STATUS_LABEL[task.status]}
                </strong>
              ) : (
                task.statusLabel ?? NHS_STATUS_LABEL[task.status]
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function NhsPanel(props: PanelProps): ReactElement {
  return (
    <div className="nhsuk-panel">
      <h1 className="nhsuk-panel__title">{props.title}</h1>
      {props.children !== undefined ? (
        <div className="nhsuk-panel__body">{props.children}</div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// App chrome
// ---------------------------------------------------------------------------

export function NhsHeader(props: HeaderProps): ReactElement {
  const {
    serviceName,
    serviceUrl = '/',
    homepageUrl = '/',
    navigation,
    navigationLabel = 'Menu',
  } = props;
  return (
    <header className="nhsuk-header" role="banner">
      <div className="nhsuk-header__container nhsuk-width-container">
        <div className="nhsuk-header__service">
          <a className="nhsuk-header__service-logo" href={homepageUrl} aria-label="NHS homepage">
            <svg
              className="nhsuk-header__logo"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 40 16"
              height="40"
              width="100"
              focusable="false"
              role="img"
              aria-hidden="true"
            >
              <rect width="40" height="16" fill="#fff" rx="1" />
              <text x="20" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="#005eb8">
                NHS
              </text>
            </svg>
          </a>
          {serviceName ? (
            <a className="nhsuk-header__service-name" href={serviceUrl}>
              {serviceName}
            </a>
          ) : null}
        </div>
        {navigation && navigation.length > 0 ? (
          <nav className="nhsuk-header__navigation" aria-label={navigationLabel}>
            <ul className="nhsuk-header__navigation-list">
              {navigation.map((item) => (
                <li key={item.href} className="nhsuk-header__navigation-item">
                  <a className="nhsuk-header__navigation-link" href={item.href}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </header>
  );
}

export function NhsFooter(props: FooterProps): ReactElement {
  const { links } = props;
  return (
    <footer role="contentinfo">
      <div className="nhsuk-footer" id="nhsuk-footer">
        <div className="nhsuk-width-container">
          {links && links.length > 0 ? (
            <ul className="nhsuk-footer__list">
              {links.map((l) => (
                <li key={l.href} className="nhsuk-footer__list-item">
                  <a className="nhsuk-footer__list-item-link" href={l.href}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="nhsuk-body-s">© NHS England</p>
        </div>
      </div>
    </footer>
  );
}

export function NhsCookieBanner(props: CookieBannerProps): ReactElement {
  const {
    serviceName,
    description,
    acceptAction,
    rejectAction,
    viewCookiesHref,
    acceptLabel = 'Accept analytics cookies',
    rejectLabel = 'Reject analytics cookies',
    viewCookiesLabel = 'View cookies',
  } = props;
  return (
    <div
      className="nhsuk-width-container"
      role="region"
      aria-label={`Cookies on ${serviceName}`}
      style={{ paddingTop: 20, paddingBottom: 20 }}
    >
      <h2 className="nhsuk-heading-m">Cookies on {serviceName}</h2>
      <div className="nhsuk-body">
        {description ?? (
          <p>
            We use some essential cookies to make this service work. We would also
            like to use analytics cookies so we can understand how you use the
            service and make improvements.
          </p>
        )}
      </div>
      <div className="nhsuk-button-group">
        <form action={acceptAction} style={{ display: 'inline' }}>
          <NhsButton type="submit">{acceptLabel}</NhsButton>
        </form>
        <form action={rejectAction} style={{ display: 'inline' }}>
          <NhsButton type="submit">{rejectLabel}</NhsButton>
        </form>
        {viewCookiesHref ? (
          <a className="nhsuk-link" href={viewCookiesHref}>
            {viewCookiesLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}
