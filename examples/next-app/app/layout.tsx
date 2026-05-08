import 'govuk-frontend/dist/govuk/govuk-frontend.min.css';

import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { CookieBanner, Footer, Header } from 'teleportal-gds';
import {
  acceptCookiesAction,
  rejectCookiesAction,
} from 'teleportal-gds/actions';
import { GovukInit } from 'teleportal-gds/components/GovukInit';

export const metadata = {
  title: 'TelePortal GDS — Sample App',
};

const SERVICE_NAME = 'TelePortal Sample';

const FOOTER_LINKS = [
  { label: 'Help', href: '/help' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Cookies', href: '/cookies' },
  { label: 'Accessibility statement', href: '/accessibility' },
];

export default async function RootLayout({ children }: { children: ReactNode }) {
  const c = await cookies();
  const consent = c.get('cookie-consent')?.value;

  return (
    <html lang="en" className="govuk-template">
      <body className="govuk-template__body">
        {!consent ? (
          <CookieBanner
            serviceName={SERVICE_NAME}
            acceptAction={acceptCookiesAction}
            rejectAction={rejectCookiesAction}
            viewCookiesHref="/cookies"
          />
        ) : null}
        <Header serviceName={SERVICE_NAME} serviceUrl="/" homepageUrl="/" />
        <div className="govuk-width-container">
          <main className="govuk-main-wrapper">{children}</main>
        </div>
        <Footer links={FOOTER_LINKS} />
        <GovukInit />
      </body>
    </html>
  );
}
