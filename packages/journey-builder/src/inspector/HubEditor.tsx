/**
 * Editor for a `HubPage`. Page-level properties + per-row editor for
 * `items[]`, including each item's ordered `sources[]` (valueFrom paths,
 * optional `equals`, optional `literal` overrides, optional `displayPaths`).
 *
 * The hub is the most fiddly type to author manually — the inline editor
 * here covers everything needed to reproduce the contact-details fixture
 * without writing JSON.
 */

import type { HubItem, HubItemSource, HubPage } from '../schema';
import { useBuilderStore } from '../store';
import {
  ActionButton,
  Field,
  Section,
  TextArea,
  TextInput,
} from './controls';

export function HubEditor(props: { journeyId: string; page: HubPage }) {
  const { journeyId, page } = props;
  const update = useBuilderStore((s) => s.updateHubPage);

  const setItems = (items: HubItem[]) => update(journeyId, page.id, { items });

  return (
    <div className="flex flex-col gap-3">
      <Section title="Hub page">
        <Field label="Hub id">
          <TextInput
            value={page.id}
            onChange={(v) => update(journeyId, page.id, { id: v })}
            monospace
          />
        </Field>
        <Field label="Title">
          <TextInput
            value={page.title}
            onChange={(v) => update(journeyId, page.id, { title: v })}
          />
        </Field>
        <Field label="Description (optional)">
          <TextArea
            value={page.description ?? ''}
            onChange={(v) =>
              update(journeyId, page.id, v === '' ? { description: undefined } : { description: v })
            }
          />
        </Field>
        <Field label="Continue button label (optional)">
          <TextInput
            value={page.continueLabel ?? ''}
            onChange={(v) =>
              update(journeyId, page.id, v === '' ? { continueLabel: undefined } : { continueLabel: v })
            }
          />
        </Field>
      </Section>

      <Section title="Navigation">
        <Field label="Next token">
          <TextInput
            value={page.next}
            onChange={(v) => update(journeyId, page.id, { next: v })}
            monospace
          />
        </Field>
        <Field label="Back token (optional)">
          <TextInput
            value={page.back ?? ''}
            onChange={(v) =>
              update(journeyId, page.id, v === '' ? { back: undefined } : { back: v })
            }
            monospace
          />
        </Field>
      </Section>

      <Section
        title={`Items (${page.items.length})`}
        action={
          <ActionButton
            onClick={() =>
              setItems([
                ...page.items,
                {
                  id: `item-${page.items.length + 1}`,
                  key: 'New item',
                  link: '',
                  addLabel: 'Add',
                  sources: [{ valueFrom: '' }],
                },
              ])
            }
          >
            + Add item
          </ActionButton>
        }
      >
        {page.items.length === 0 ? (
          <div className="rounded border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500">
            No items yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {page.items.map((item, i) => (
              <HubItemRow
                key={item.id}
                item={item}
                onChange={(patch) =>
                  setItems(
                    page.items.map((it, j) =>
                      j === i ? { ...it, ...patch } : it,
                    ),
                  )
                }
                onRemove={() =>
                  setItems(page.items.filter((_, j) => j !== i))
                }
              />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function HubItemRow(props: {
  item: HubItem;
  onChange: (patch: Partial<HubItem>) => void;
  onRemove: () => void;
}) {
  const { item, onChange, onRemove } = props;

  const setSources = (sources: HubItemSource[]) => onChange({ sources });

  return (
    <li className="flex flex-col gap-1.5 rounded border border-slate-200 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Item {item.id}
        </span>
        <ActionButton variant="ghost" onClick={onRemove}>
          remove
        </ActionButton>
      </div>
      <Field label="Item id">
        <TextInput value={item.id} onChange={(v) => onChange({ id: v })} monospace />
      </Field>
      <Field label="Row label (key)">
        <TextInput value={item.key} onChange={(v) => onChange({ key: v })} />
      </Field>
      <Field label="Add-link label (when no source matches)">
        <TextInput
          value={item.addLabel}
          onChange={(v) => onChange({ addLabel: v })}
        />
      </Field>
      <Field label="Change-link label (default 'Change')">
        <TextInput
          value={item.changeLabel ?? ''}
          onChange={(v) =>
            onChange(v === '' ? { changeLabel: undefined } : { changeLabel: v })
          }
        />
      </Field>
      <Field label="Link target (form id or token)">
        <TextInput
          value={item.link}
          onChange={(v) => onChange({ link: v })}
          monospace
        />
      </Field>
      <Field label="Show-when path (optional)" hint="Item only renders when this path resolves non-empty">
        <TextInput
          value={item.showWhen ?? ''}
          onChange={(v) =>
            onChange(v === '' ? { showWhen: undefined } : { showWhen: v })
          }
          monospace
        />
      </Field>

      <details className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Sources ({item.sources.length})
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          {item.sources.map((src, i) => (
            <SourceRow
              key={i}
              source={src}
              onChange={(patch) =>
                setSources(
                  item.sources.map((s, j) =>
                    j === i ? mergeSource(s, patch) : s,
                  ),
                )
              }
              onRemove={() => setSources(item.sources.filter((_, j) => j !== i))}
            />
          ))}
          <ActionButton
            onClick={() => setSources([...item.sources, { valueFrom: '' }])}
          >
            + Add source
          </ActionButton>
        </div>
      </details>
    </li>
  );
}

function mergeSource(s: HubItemSource, patch: Partial<HubItemSource>): HubItemSource {
  const next: HubItemSource = { ...s, ...patch };
  // Strip emptied optional fields to keep round-trips byte-equivalent.
  if (next.equals === '') delete (next as { equals?: string }).equals;
  if (next.literal === '') delete (next as { literal?: string }).literal;
  if (next.displayPaths && next.displayPaths.length === 0) {
    delete (next as { displayPaths?: string[] }).displayPaths;
  }
  return next;
}

function SourceRow(props: {
  source: HubItemSource;
  onChange: (patch: Partial<HubItemSource>) => void;
  onRemove: () => void;
}) {
  const { source, onChange, onRemove } = props;
  const displayPathsText = (source.displayPaths ?? []).join('\n');
  return (
    <div className="flex flex-col gap-1.5 rounded border border-slate-200 bg-white p-2">
      <div className="flex justify-end">
        <ActionButton variant="ghost" onClick={onRemove}>
          remove
        </ActionButton>
      </div>
      <Field label="valueFrom path" hint="e.g. application-contact.firstName">
        <TextInput
          value={source.valueFrom}
          onChange={(v) => onChange({ valueFrom: v })}
          monospace
        />
      </Field>
      <Field label="Equals (optional)" hint="Source only matches when value === equals">
        <TextInput
          value={source.equals ?? ''}
          onChange={(v) => onChange({ equals: v })}
        />
      </Field>
      <Field
        label="Literal display (optional)"
        hint="Static text shown when this source matches; wins over displayPaths"
      >
        <TextArea
          value={source.literal ?? ''}
          onChange={(v) => onChange({ literal: v === '' ? undefined : v })}
          rows={2}
        />
      </Field>
      <Field
        label="Display paths (one per line)"
        hint="Resolved values are joined with newlines for display"
      >
        <TextArea
          value={displayPathsText}
          onChange={(v) => {
            const lines = v
              .split('\n')
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            onChange({ displayPaths: lines.length === 0 ? undefined : lines });
          }}
          rows={3}
        />
      </Field>
    </div>
  );
}
