import type { ReactElement } from 'react';

export type FooterLink = {
  label: string;
  href: string;
};

export type FooterProps = {
  /** Inline support links shown above the licence note. */
  links?: FooterLink[];
  /** Visually-hidden heading for the meta block. */
  metaTitle?: string;
};

export function Footer(props: FooterProps): ReactElement {
  const { links, metaTitle = 'Support links' } = props;

  return (
    <footer className="govuk-footer">
      <div className="govuk-width-container">
        <div className="govuk-footer__meta">
          <div className="govuk-footer__meta-item govuk-footer__meta-item--grow">
            <h2 className="govuk-visually-hidden">{metaTitle}</h2>
            {links && links.length > 0 ? (
              <ul className="govuk-footer__inline-list">
                {links.map((l) => (
                  <li key={l.href} className="govuk-footer__inline-list-item">
                    <a className="govuk-footer__link" href={l.href}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <span className="govuk-footer__licence-description">
              All content is available under the{' '}
              <a
                className="govuk-footer__link"
                href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
                rel="license"
              >
                Open Government Licence v3.0
              </a>
              , except where otherwise stated
            </span>
          </div>
          <div className="govuk-footer__meta-item">
            <a
              className="govuk-footer__link govuk-footer__copyright-logo"
              href="https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/"
            >
              © Crown copyright
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
