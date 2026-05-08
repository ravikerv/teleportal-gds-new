import type { ReactElement, ReactNode } from 'react';

export type ButtonProps = {
  children: ReactNode;
  type?: 'submit' | 'button' | 'reset';
  variant?: 'primary' | 'secondary' | 'warning' | 'inverse';
  name?: string;
  value?: string;
  disabled?: boolean;
  /** Renders the button as a styled link. */
  href?: string;
};

const VARIANT_CLASS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: '',
  secondary: ' govuk-button--secondary',
  warning: ' govuk-button--warning',
  inverse: ' govuk-button--inverse',
};

export function Button(props: ButtonProps): ReactElement {
  const {
    children,
    type = 'submit',
    variant = 'primary',
    name,
    value,
    disabled,
    href,
  } = props;

  const className = `govuk-button${VARIANT_CLASS[variant]}${disabled ? ' govuk-button--disabled' : ''}`;

  if (href !== undefined) {
    return (
      <a
        className={className}
        href={href}
        role="button"
        draggable={false}
        data-module="govuk-button"
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
      data-module="govuk-button"
    >
      {children}
    </button>
  );
}
