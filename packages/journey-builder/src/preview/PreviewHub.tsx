/**
 * Static preview of a `HubPage`. Walks each item's ordered `sources[]`
 * and shows the first one that resolves non-empty against `mockAnswers`
 * (per-form bag); otherwise renders an "Add" link, mirroring how
 * HubRenderer behaves at runtime.
 */

import { useSkinClass } from './skin';
import type { HubPage, HubItem, HubItemSource } from '../schema';

export function PreviewHub({
  page,
  mockAnswers = {},
  onItemLink,
  onContinue,
}: {
  page: HubPage;
  mockAnswers?: Record<string, Record<string, string>>;
  /** Walkthrough mode: add/change links navigate to the item's target. */
  onItemLink?: (item: HubItem) => void;
  /** Walkthrough mode: the continue button follows `page.next`. */
  onContinue?: () => void;
}) {
  const s = useSkinClass();
  const visibleItems = page.items.filter((item) =>
    item.showWhen ? !!resolve(mockAnswers, item.showWhen) : true,
  );

  return (
    <div>
      <h1 className={s('govuk-heading-l')}>{page.title}</h1>
      {page.description ? <p className={s('govuk-body')}>{page.description}</p> : null}
      <dl className={s('govuk-summary-list')}>
        {visibleItems.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            mockAnswers={mockAnswers}
            {...(onItemLink ? { onItemLink } : {})}
          />
        ))}
      </dl>
      <button
        className={s('govuk-button')}
        type="button"
        data-module="govuk-button"
        onClick={onContinue}
      >
        {page.continueLabel ?? 'Continue'}
      </button>
    </div>
  );
}

function ItemRow({
  item,
  mockAnswers,
  onItemLink,
}: {
  item: HubItem;
  mockAnswers: Record<string, Record<string, string>>;
  onItemLink?: (item: HubItem) => void;
}) {
  const s = useSkinClass();
  const matched = item.sources
    .map((src) => matchSource(src, mockAnswers))
    .find((d) => d !== null);

  const follow = (e: React.MouseEvent) => {
    e.preventDefault();
    onItemLink?.(item);
  };

  return (
    <div className={s('govuk-summary-list__row')}>
      <dt className={s('govuk-summary-list__key')}>{item.key}</dt>
      <dd className={s('govuk-summary-list__value')} style={{ whiteSpace: 'pre-line' }}>
        {matched ?? (
          <a className={s('govuk-link')} href="#" onClick={follow}>
            {item.addLabel}
          </a>
        )}
      </dd>
      {matched ? (
        <dd className={s('govuk-summary-list__actions')}>
          <a className={s('govuk-link')} href="#" onClick={follow}>
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
