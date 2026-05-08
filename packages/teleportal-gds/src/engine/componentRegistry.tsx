/**
 * Schema-field-type → wrapper-component mapping. The single dispatch
 * point used by every renderer. `componentRegistry` is the raw lookup
 * (FieldType → wrapper component); `renderField` is the higher-level
 * adapter that translates a schema field + render context into a
 * fully-propped JSX element.
 *
 * `renderField` walks recursively into radio/checkbox `option.conditional`
 * so each nested field is pre-rendered before the outer wrapper sees it.
 * The render context is the *whole* answers/errors maps; per-field lookups
 * happen here so nested fields can pull their own values.
 */

import { Fragment, type ComponentType, type ReactElement } from 'react';

import { Checkbox, type CheckboxOption } from '../components/Checkbox';
import { DatePicker } from '../components/DatePicker';
import { Input } from '../components/Input';
import { Radio, type RadioOption } from '../components/Radio';
import { Select } from '../components/Select';
import { TextArea } from '../components/TextArea';
import type { FormAnswers, JsonValue } from '../shared/types/journey.types';
import type {
  FieldOption,
  FieldType,
  FormField,
} from '../shared/types/schema.types';

/**
 * Loose-typed value shape — wrapper props differ per field type, so a
 * shared component prop type isn't useful. Use `renderField` for the
 * type-safe path; this map is for dispatch + introspection.
 */
export const componentRegistry = {
  input: Input,
  select: Select,
  radio: Radio,
  checkbox: Checkbox,
  datepicker: DatePicker,
  textarea: TextArea,
} as const satisfies Record<FieldType, ComponentType<never>>;

export type FieldRenderContext = {
  /** Full set of pre-fill values for the form, keyed by field id. */
  values: FormAnswers;
  /** Inline errors for the form, keyed by field id. */
  errors: Record<string, string>;
  /**
   * Server-resolved dynamic options for select fields whose schema declares
   * a `dataSource`. Keyed by field id. Static `options` on the field still
   * win when both are present.
   */
  dataSources?: Record<string, FieldOption[]>;
};

function asString(value: JsonValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asStringArray(value: JsonValue | undefined): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === 'string');
}

function mapOptionsForRadio(
  options: FieldOption[],
  ctx: FieldRenderContext,
): RadioOption[] {
  return options.map((opt) => {
    const radioOpt: RadioOption = { value: opt.value, label: opt.label };
    if (opt.hint !== undefined) radioOpt.hint = opt.hint;
    if (opt.conditional && opt.conditional.length > 0) {
      radioOpt.conditional = (
        <>
          {opt.conditional.map((nested) => (
            <Fragment key={nested.id}>{renderField(nested, ctx)}</Fragment>
          ))}
        </>
      );
    }
    return radioOpt;
  });
}

function mapOptionsForCheckbox(
  options: FieldOption[],
  ctx: FieldRenderContext,
): CheckboxOption[] {
  return options.map((opt) => {
    const cbOpt: CheckboxOption = { value: opt.value, label: opt.label };
    if (opt.hint !== undefined) cbOpt.hint = opt.hint;
    if (opt.conditional && opt.conditional.length > 0) {
      cbOpt.conditional = (
        <>
          {opt.conditional.map((nested) => (
            <Fragment key={nested.id}>{renderField(nested, ctx)}</Fragment>
          ))}
        </>
      );
    }
    return cbOpt;
  });
}

/**
 * Adapt a schema field + render context into a wrapper-component call.
 * Every FieldType has a clause; `never` return is unreachable at runtime
 * (the FieldType union is exhaustive), but TS narrows safely.
 */
export function renderField(field: FormField, ctx: FieldRenderContext): ReactElement {
  const value = ctx.values[field.id];
  const error = ctx.errors[field.id];

  switch (field.type) {
    case 'input':
      return (
        <Input
          id={field.id}
          name={field.id}
          label={field.label}
          hint={field.hint}
          inputType={field.inputType ?? 'text'}
          autocomplete={field.autocomplete}
          defaultValue={asString(value)}
          error={error}
          required={field.validation?.required}
        />
      );
    case 'select': {
      const resolvedOptions = field.options ?? ctx.dataSources?.[field.id] ?? [];
      return (
        <Select
          id={field.id}
          name={field.id}
          label={field.label}
          hint={field.hint}
          options={resolvedOptions}
          placeholder={field.placeholder}
          defaultValue={asString(value)}
          error={error}
          required={field.validation?.required}
        />
      );
    }
    case 'radio':
      return (
        <Radio
          id={field.id}
          name={field.id}
          label={field.label}
          hint={field.hint}
          options={mapOptionsForRadio(field.options, ctx)}
          defaultValue={asString(value)}
          error={error}
          required={field.validation?.required}
        />
      );
    case 'checkbox':
      return (
        <Checkbox
          id={field.id}
          name={field.id}
          label={field.label}
          hint={field.hint}
          options={mapOptionsForCheckbox(field.options, ctx)}
          defaultValues={asStringArray(value)}
          error={error}
          required={field.validation?.required}
        />
      );
    case 'datepicker':
      return (
        <DatePicker
          id={field.id}
          name={field.id}
          label={field.label}
          hint={field.hint}
          defaultValue={asString(value)}
          error={error}
          required={field.validation?.required}
        />
      );
    case 'textarea':
      return (
        <TextArea
          id={field.id}
          name={field.id}
          label={field.label}
          hint={field.hint}
          rows={field.rows}
          defaultValue={asString(value)}
          error={error}
          required={field.validation?.required}
        />
      );
  }
}

