import type { ReactElement, ReactNode } from 'react';

/**
 * Server-Component-safe cookie banner. Renders the GovUK markup with
 * Accept / Reject submit buttons that post to consumer-supplied Server
 * Actions; the consumer is responsible for setting consent cookies and
 * (typically) calling `revalidatePath('/')` so the layout re-renders
 * without the banner. The library ships a default pair of actions at
 * `'teleportal-gds/actions'` (`acceptCookiesAction`, `rejectCookiesAction`)
 * that store consent under the `cookie-consent` cookie.
 *
 * The consumer chooses whether to render this component (typically based
 * on the presence of the `cookie-consent` cookie) — there is no
 * `visible?` prop so all rendering policy lives in the layout.
 */
export type CookieBannerProps = {
  /** Service name shown in the heading and aria label. */
  serviceName: string;
  /** Description body. Defaults to a generic analytics-cookies message. */
  description?: ReactNode;
  /** Server Action invoked when the user accepts analytics cookies. */
  acceptAction: (formData: FormData) => Promise<void> | void;
  /** Server Action invoked when the user rejects analytics cookies. */
  rejectAction: (formData: FormData) => Promise<void> | void;
  /** Optional "View cookies" link target. */
  viewCookiesHref?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  viewCookiesLabel?: string;
};

const defaultDescription = (
  <>
    <p className="govuk-body">
      We use some essential cookies to make this service work.
    </p>
    <p className="govuk-body">
      We&apos;d also like to use analytics cookies so we can understand how you
      use the service and make improvements.
    </p>
  </>
);

export function CookieBanner(props: CookieBannerProps): ReactElement {
  const {
    serviceName,
    description = defaultDescription,
    acceptAction,
    rejectAction,
    viewCookiesHref,
    acceptLabel = 'Accept analytics cookies',
    rejectLabel = 'Reject analytics cookies',
    viewCookiesLabel = 'View cookies',
  } = props;

  return (
    <div
      className="govuk-cookie-banner"
      data-nosnippet
      role="region"
      aria-label={`Cookies on ${serviceName}`}
    >
      <div className="govuk-cookie-banner__message govuk-width-container">
        <div className="govuk-grid-row">
          <div className="govuk-grid-column-two-thirds">
            <h2 className="govuk-cookie-banner__heading govuk-heading-m">
              Cookies on {serviceName}
            </h2>
            <div className="govuk-cookie-banner__content">{description}</div>
          </div>
        </div>
        <div className="govuk-button-group">
          <form action={acceptAction}>
            <button
              type="submit"
              className="govuk-button"
              data-module="govuk-button"
            >
              {acceptLabel}
            </button>
          </form>
          <form action={rejectAction}>
            <button
              type="submit"
              className="govuk-button"
              data-module="govuk-button"
            >
              {rejectLabel}
            </button>
          </form>
          {viewCookiesHref ? (
            <a className="govuk-link" href={viewCookiesHref}>
              {viewCookiesLabel}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
