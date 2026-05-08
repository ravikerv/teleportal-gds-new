/**
 * Editor for a journey's `SummarySchema`. Page-level + structured editors
 * for `headerRows[]` (static rows above any looping block) and the
 * `entries{}` block (per-entry row template + Add another / Remove
 * config).
 */

import type {
  SummaryEntriesBlock,
  SummaryEntryRow,
  SummaryRow,
  SummarySchema,
} from '../schema';
import { useBuilderStore } from '../store';
import {
  ActionButton,
  Field,
  Section,
  TextArea,
  TextInput,
} from './controls';

export function SummaryEditor(props: { journeyId: string; schema: SummarySchema }) {
  const { journeyId, schema } = props;
  const update = useBuilderStore((s) => s.updateSummary);

  return (
    <div className="flex flex-col gap-3">
      <Section title="Summary page">
        <Field label="Title">
          <TextInput value={schema.title} onChange={(v) => update(journeyId, { title: v })} />
        </Field>
        <Field label="Caption (optional)">
          <TextInput
            value={schema.caption ?? ''}
            onChange={(v) =>
              update(journeyId, v === '' ? { caption: undefined } : { caption: v })
            }
          />
        </Field>
        <Field label="Description (optional)">
          <TextArea
            value={schema.description ?? ''}
            onChange={(v) =>
              update(journeyId, v === '' ? { description: undefined } : { description: v })
            }
          />
        </Field>
        <Field label="Continue button label (optional)">
          <TextInput
            value={schema.submitLabel ?? ''}
            onChange={(v) =>
              update(journeyId, v === '' ? { submitLabel: undefined } : { submitLabel: v })
            }
          />
        </Field>
      </Section>

      <Section title="Navigation">
        <Field label="Next token">
          <TextInput
            value={schema.next}
            onChange={(v) => update(journeyId, { next: v })}
            monospace
          />
        </Field>
        <Field label="Back token (optional)">
          <TextInput
            value={schema.back ?? ''}
            onChange={(v) => update(journeyId, v === '' ? { back: undefined } : { back: v })}
            monospace
          />
        </Field>
      </Section>

      <HeaderRowsEditor
        rows={schema.headerRows ?? []}
        onChange={(rows) =>
          update(journeyId, rows.length === 0 ? { headerRows: undefined } : { headerRows: rows })
        }
      />

      <EntriesEditor
        entries={schema.entries}
        onChange={(entries) => update(journeyId, { entries })}
      />
    </div>
  );
}

function HeaderRowsEditor(props: {
  rows: SummaryRow[];
  onChange: (rows: SummaryRow[]) => void;
}) {
  const { rows, onChange } = props;
  const addRow = () =>
    onChange([...rows, { key: 'New row', valueFrom: '', changeLink: '' }]);
  const setRow = (i: number, patch: Partial<SummaryRow>) =>
    onChange(rows.map((r, j) => (i === j ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => onChange(rows.filter((_, j) => j !== i));

  return (
    <Section
      title={`Header rows (${rows.length})`}
      action={<ActionButton onClick={addRow}>+ Add row</ActionButton>}
    >
      {rows.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500">
          No header rows. Add rows here for context shown above any looping
          entries (e.g. a Yes/No question's answer with a Change link).
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={i} className="flex flex-col gap-1.5 rounded border border-slate-200 p-2">
              <div className="flex justify-end">
                <ActionButton variant="ghost" onClick={() => removeRow(i)}>
                  remove
                </ActionButton>
              </div>
              <Field label="Label">
                <TextInput value={r.key} onChange={(v) => setRow(i, { key: v })} />
              </Field>
              <Field label="valueFrom path">
                <TextInput
                  value={r.valueFrom}
                  onChange={(v) => setRow(i, { valueFrom: v })}
                  monospace
                />
              </Field>
              <Field label="Change link (form id)">
                <TextInput
                  value={r.changeLink}
                  onChange={(v) => setRow(i, { changeLink: v })}
                  monospace
                />
              </Field>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function EntriesEditor(props: {
  entries: SummaryEntriesBlock | undefined;
  onChange: (entries: SummaryEntriesBlock | undefined) => void;
}) {
  const { entries, onChange } = props;
  const enabled = !!entries;

  return (
    <Section
      title={`Entries block ${enabled ? '(set)' : '(none)'}`}
      action={
        enabled ? (
          <ActionButton variant="ghost" onClick={() => onChange(undefined)}>
            remove
          </ActionButton>
        ) : (
          <ActionButton
            onClick={() =>
              onChange({
                fromJourneyId: '',
                groupLabel: 'Item {n}',
                addAnotherLabel: 'Add another',
                rows: [],
              })
            }
          >
            + Enable
          </ActionButton>
        )
      }
    >
      {!enabled || !entries ? (
        <div className="rounded border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500">
          Use this when your summary should enumerate a looping child
          journey's entries with Change / Remove / Add-another controls.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Field label="From journey id (looping child)">
            <TextInput
              value={entries.fromJourneyId}
              onChange={(v) => onChange({ ...entries, fromJourneyId: v })}
              monospace
            />
          </Field>
          <Field label="Group label" hint="`{n}` is replaced with the 1-based index">
            <TextInput
              value={entries.groupLabel}
              onChange={(v) => onChange({ ...entries, groupLabel: v })}
            />
          </Field>
          <Field label="Add-another link label">
            <TextInput
              value={entries.addAnotherLabel}
              onChange={(v) => onChange({ ...entries, addAnotherLabel: v })}
            />
          </Field>
          <Field label="Remove link label (optional)" hint="Shown on each entry when there are 2+">
            <TextInput
              value={entries.removeLabel ?? ''}
              onChange={(v) =>
                onChange({
                  ...entries,
                  removeLabel: v === '' ? undefined : v,
                })
              }
            />
          </Field>
          <ShowWhenEditor
            showWhen={entries.showWhen}
            onChange={(showWhen) => onChange({ ...entries, showWhen })}
          />
          <EntryRowsEditor
            rows={entries.rows}
            onChange={(rows) => onChange({ ...entries, rows })}
          />
        </div>
      )}
    </Section>
  );
}

function ShowWhenEditor(props: {
  showWhen: SummaryEntriesBlock['showWhen'];
  onChange: (sw: SummaryEntriesBlock['showWhen']) => void;
}) {
  const { showWhen, onChange } = props;
  return (
    <details className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Show-when gate {showWhen ? '(set)' : ''}
      </summary>
      <div className="mt-2 flex flex-col gap-1.5">
        <Field label="valueFrom path">
          <TextInput
            value={showWhen?.valueFrom ?? ''}
            onChange={(v) =>
              onChange(
                v === ''
                  ? undefined
                  : { valueFrom: v, ...(showWhen?.equals !== undefined ? { equals: showWhen.equals } : {}) },
              )
            }
            monospace
          />
        </Field>
        <Field label="Equals (optional)">
          <TextInput
            value={showWhen?.equals ?? ''}
            onChange={(v) => {
              if (!showWhen) return;
              const next: NonNullable<SummaryEntriesBlock['showWhen']> = {
                valueFrom: showWhen.valueFrom,
              };
              if (v !== '') next.equals = v;
              onChange(next);
            }}
          />
        </Field>
      </div>
    </details>
  );
}

function EntryRowsEditor(props: {
  rows: SummaryEntryRow[];
  onChange: (rows: SummaryEntryRow[]) => void;
}) {
  const { rows, onChange } = props;
  const addRow = () =>
    onChange([
      ...rows,
      { key: 'New row', valueFrom: '', changeFormId: '' },
    ]);
  const setRow = (i: number, patch: Partial<SummaryEntryRow>) =>
    onChange(rows.map((r, j) => (i === j ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => onChange(rows.filter((_, j) => j !== i));

  return (
    <details className="rounded border border-slate-200 bg-slate-50 px-2 py-1" open>
      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Per-entry rows ({rows.length})
        <span className="ml-2 font-normal normal-case text-slate-400">
          add at least one to display anything
        </span>
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded border border-slate-200 bg-white p-2">
            <div className="flex justify-end">
              <ActionButton variant="ghost" onClick={() => removeRow(i)}>
                remove
              </ActionButton>
            </div>
            <Field label="Label">
              <TextInput value={r.key} onChange={(v) => setRow(i, { key: v })} />
            </Field>
            <Field
              label="valueFrom (single)"
              hint="Single path within the entry (e.g. details-page.firstName)"
            >
              <TextInput
                value={r.valueFrom}
                onChange={(v) => setRow(i, { valueFrom: v })}
                monospace
              />
            </Field>
            <Field
              label="valueFromAll (one path per line)"
              hint="When set, paths are resolved and joined with spaces — wins over valueFrom"
            >
              <TextArea
                value={(r.valueFromAll ?? []).join('\n')}
                onChange={(v) => {
                  const lines = v
                    .split('\n')
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
                  setRow(i, {
                    valueFromAll: lines.length === 0 ? undefined : lines,
                  });
                }}
                rows={2}
              />
            </Field>
            <Field label="Change form id">
              <TextInput
                value={r.changeFormId}
                onChange={(v) => setRow(i, { changeFormId: v })}
                monospace
              />
            </Field>
          </div>
        ))}
        <ActionButton onClick={addRow}>+ Add row</ActionButton>
      </div>
    </details>
  );
}
