/**
 * Editor for a `FormPage`. Top-of-page properties (title, formId, etc.)
 * plus a fields list with per-field id/label/type/required editing.
 *
 * `nextWhen` rules and deep validation editing land in M5 / M6 — for M3
 * we expose a simple "required" toggle and the type picker, which is
 * enough to author all the forms we currently have in the demo project.
 */

import type { FormField, FormPage, NextWhenRule } from '../schema';
import { useBuilderStore } from '../store';
import { ActionButton, Checkbox, Field, Section, Select, TextArea, TextInput } from './controls';

const FIELD_TYPES: { value: FormField['type']; label: string }[] = [
  { value: 'input', label: 'Input' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Select' },
  { value: 'datepicker', label: 'Date' },
  { value: 'textarea', label: 'Textarea' },
];

export function FormEditor(props: { journeyId: string; page: FormPage }) {
  const { journeyId, page } = props;
  const update = useBuilderStore((s) => s.updateFormPage);
  const addField = useBuilderStore((s) => s.addField);
  const removeField = useBuilderStore((s) => s.removeField);
  const updateField = useBuilderStore((s) => s.updateField);

  return (
    <div className="flex flex-col gap-3">
      <Section title="Page">
        <Field label="Form id (URL slug)">
          <TextInput
            value={page.formId}
            onChange={(v) => update(journeyId, page.formId, { formId: v })}
            monospace
          />
        </Field>
        <Field label="Title">
          <TextInput
            value={page.title}
            onChange={(v) => update(journeyId, page.formId, { title: v })}
          />
        </Field>
        <Field label="Caption (optional)">
          <TextInput
            value={page.caption ?? ''}
            onChange={(v) =>
              update(journeyId, page.formId, v === '' ? { caption: undefined } : { caption: v })
            }
          />
        </Field>
        <Field label="Description (optional)">
          <TextArea
            value={page.description ?? ''}
            onChange={(v) =>
              update(journeyId, page.formId, v === '' ? { description: undefined } : { description: v })
            }
          />
        </Field>
      </Section>

      <Section title="Navigation">
        <Field
          label="Next token"
          hint="Form id, 'summary', 'task-list', 'journey-root', 'parent-summary', or 'add-instance:{jid}'"
        >
          <TextInput
            value={page.next}
            onChange={(v) => update(journeyId, page.formId, { next: v })}
            monospace
          />
        </Field>
        <Field label="Back token (optional)">
          <TextInput
            value={page.back ?? ''}
            onChange={(v) =>
              update(journeyId, page.formId, v === '' ? { back: undefined } : { back: v })
            }
            monospace
          />
        </Field>
        <Field label="Submit label (optional)">
          <TextInput
            value={page.submitLabel ?? ''}
            onChange={(v) =>
              update(journeyId, page.formId, v === '' ? { submitLabel: undefined } : { submitLabel: v })
            }
          />
        </Field>
      </Section>

      <NextWhenEditor
        page={page}
        onChange={(rules) =>
          update(
            journeyId,
            page.formId,
            rules.length === 0 ? { nextWhen: undefined } : { nextWhen: rules },
          )
        }
      />

      <Section
        title={`Fields (${page.fields.length})`}
        action={<ActionButton onClick={() => addField(journeyId, page.formId)}>+ Add</ActionButton>}
      >
        {page.fields.length === 0 ? (
          <div className="rounded border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500">
            No fields yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {page.fields.map((f) => (
              <FieldRow
                key={f.id}
                field={f}
                onChange={(patch) => updateField(journeyId, page.formId, f.id, patch)}
                onRemove={() => removeField(journeyId, page.formId, f.id)}
              />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function NextWhenEditor(props: {
  page: FormPage;
  onChange: (rules: NextWhenRule[]) => void;
}) {
  const rules = props.page.nextWhen ?? [];
  const setRule = (idx: number, patch: Partial<NextWhenRule>) =>
    props.onChange(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeRule = (idx: number) =>
    props.onChange(rules.filter((_, i) => i !== idx));
  const addRule = () =>
    props.onChange([...rules, { fieldId: '', value: '', then: '' }]);
  return (
    <Section
      title={`Conditional next (${rules.length})`}
      action={<ActionButton onClick={addRule}>+ Add rule</ActionButton>}
    >
      {rules.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500">
          No conditional rules. The default <code>next</code> applies.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.map((r, i) => (
            <li key={i} className="flex flex-col gap-1.5 rounded border border-slate-200 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Rule {i + 1}
                </span>
                <ActionButton variant="ghost" onClick={() => removeRule(i)}>
                  remove
                </ActionButton>
              </div>
              <Field label="When field id">
                <TextInput
                  value={r.fieldId}
                  onChange={(v) => setRule(i, { fieldId: v })}
                  monospace
                />
              </Field>
              <Field label="Equals value">
                <TextInput value={r.value} onChange={(v) => setRule(i, { value: v })} />
              </Field>
              <Field
                label="Then go to"
                hint="Form id, 'summary', 'task-list', 'parent-summary', 'add-instance:{jid}', or 'journey:{jid}'"
              >
                <TextInput
                  value={r.then}
                  onChange={(v) => setRule(i, { then: v })}
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

function FieldRow(props: {
  field: FormField;
  onChange: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const { field, onChange, onRemove } = props;
  const required = field.validation?.required ?? false;
  return (
    <li className="flex flex-col gap-1.5 rounded border border-slate-200 p-2">
      <div className="flex items-center gap-2">
        <Select
          value={field.type}
          onChange={(v) => onChange({ type: v })}
          options={FIELD_TYPES}
        />
        <ActionButton variant="ghost" onClick={onRemove}>
          remove
        </ActionButton>
      </div>
      <Field label="Field id">
        <TextInput value={field.id} onChange={(v) => onChange({ id: v })} monospace />
      </Field>
      <Field label="Label">
        <TextInput value={field.label} onChange={(v) => onChange({ label: v })} />
      </Field>
      <Checkbox
        checked={required}
        onChange={(v) =>
          onChange({
            validation: { ...(field.validation ?? {}), required: v },
          })
        }
        label="Required"
      />
    </li>
  );
}
