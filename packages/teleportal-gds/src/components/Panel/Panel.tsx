/**
 * Wrapper around the GovUK confirmation panel. Used by the engine's
 * ConfirmationRenderer; the title is the big headline, children render
 * inside the panel body (typically a reference number).
 */

import type { ReactElement, ReactNode } from 'react';

export type PanelProps = {
  title: string;
  children?: ReactNode;
};

export function Panel(props: PanelProps): ReactElement {
  return (
    <div className="govuk-panel govuk-panel--confirmation">
      <h1 className="govuk-panel__title">{props.title}</h1>
      {props.children !== undefined ? (
        <div className="govuk-panel__body">{props.children}</div>
      ) : null}
    </div>
  );
}
