/**
 * Static preview of a `HubPage`. Walks each item's ordered `sources[]`
 * and shows the first one that resolves non-empty against `mockAnswers`
 * (per-form bag); otherwise renders an "Add" link, mirroring how
 * HubRenderer behaves at runtime.
 */

import type { HubPage, HubItem, HubItemSource } from '../schema';

export function PreviewHub({
  page,
  mockAnswers = {},
}: {
  page: HubPage;
  mockAnswers?: Record<string, Record<string, string>>;
}) {
  const visibleItems = page.items.filter((item) =>
    item.showWhen ? !!resolve(mockAnswers, item.showWhen) : true,
  );

  return (
    <div>
      <h1 className="govuk-heading-l">{page.title}</h1>
      {page.description ? <p className="govuk-body">{page.description}</p> : null}
      <dl className="govuk-summary-list">
        {visibleItems.map((item) => (
          <ItemRow key={item.id} item={item} mockAnswers={mockAnswers} />
        ))}
      </dl>
      <button className="govuk-button" type="button" data-module="govuk-button">
        {page.continueLabel ?? 'Continue'}
      </button>
    </div>
  );
}

function ItemRow({
  item,
  mockAnswers,
}: {
  item: HubItem;
  mockAnswers: Record<string, Record<string, string>>;
}) {
  const matched = item.sources
    .map((src) => matchSource(src, mockAnswers))
    .find((d) => d !== null);

  return (
    <div className="govuk-summary-list__row">
      <dt className="govuk-summary-list__key">{item.key}</dt>
      <dd className="govuk-summary-list__value" style={{ whiteSpace: 'pre-line' }}>
        {matched ?? <a className="govuk-link" href="#">{item.addLabel}</a>}
      </dd>
      {matched ? (
        <dd className="govuk-summary-list__actions">
          <a className="govuk-link" href="#">
            {item.changeLabel ?? 'Change'}
          </a>
        </dd>
      ) : null}
    </div>
  );
}

function matchSource(
  src: HubItemSource,
  mockAnswers: Record<string, Record<string, string>>,
): string | null {
  const v = resolve(mockAnswers, src.valueFrom);
  if (!v) return null;
  if (src.equals !== undefined && v !== src.equals) return null;
  if (src.literal !== undefined) return src.literal;
  if (src.displayPaths && src.displayPaths.length > 0) {
    return src.displayPaths
      .map((p) => resolve(mockAnswers, p))
      .filter(Boolean)
      .join('\n');
  }
  return v;
}

function resolve(
  mockAnswers: Record<string, Record<string, string>>,
  path: string,
): string | null {
  const [formId, fieldId] = path.split('.');
  if (!formId || !fieldId) return null;
  return mockAnswers[formId]?.[fieldId] ?? null;
}
