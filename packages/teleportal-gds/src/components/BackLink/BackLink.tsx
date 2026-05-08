import type { ReactElement, ReactNode } from 'react';

export type BackLinkProps = {
  href: string;
  /** Visible label. Defaults to "Back". */
  children?: ReactNode;
  /**
   * Render an inverse-on-dark variant for use over coloured backgrounds.
   */
  inverse?: boolean;
};

export function BackLink(props: BackLinkProps): ReactElement {
  const { href, children = 'Back', inverse } = props;
  return (
    <a
      href={href}
      className={`govuk-back-link${inverse ? ' govuk-back-link--inverse' : ''}`}
    >
      {children}
    </a>
  );
}
