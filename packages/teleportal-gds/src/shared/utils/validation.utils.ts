/**
 * Yup schema construction from a FormSchema's fields. Supports the rules
 * named in IMPLEMENTATION_PROMPT.md §validation-utils: required, minLength,
 * maxLength, pattern, min/max for numbers, and per-rule custom messages.
 */

import * as yup from 'yup';

import type { FormField } from '../types/schema.types';
import type { ValidationResult } from '../types/component.types';
import { flattenFields } from './schema.utils';

type DefaultMessages = {
  required: string;
  minLength: (n: number) => string;
  maxLength: (n: number) => string;
  pattern: string;
  min: (n: number) => string;
  max: (n: number) => string;
  type: string;
};

function defaultMessages(label: string): DefaultMessages {
  return {
    required: `${label} is required`,
    minLength: (n) => `${label} must be at least ${n} characters`,
    maxLength: (n) => `${label} must be at most ${n} characters`,
    pattern: `${label} is not in the correct format`,
    min: (n) => `${label} must be at least ${n}`,
    max: (n) => `${label} must be at most ${n}`,
    type: `${label} must be a number`,
  };
}

function buildStringValidator(field: FormField): yup.AnySchema {
  const v = field.validation ?? {};
  const msgs = defaultMessages(field.label);
  const custom = v.messages ?? {};

  let s = yup
    .string()
    .transform((val: unknown) => (val === '' ? null : val))
    .nullable();

  if (v.minLength !== undefined) {
    s = s.min(v.minLength, custom.minLength ?? msgs.minLength(v.minLength));
  }
  if (v.maxLength !== undefined) {
    s = s.max(v.maxLength, custom.maxLength ?? msgs.maxLength(v.maxLength));
  }
  if (v.pattern !== undefined) {
    s = s.matches(new RegExp(v.pattern), {
      message: custom.pattern ?? msgs.pattern,
      excludeEmptyString: true,
    });
  }
  if (v.required) {
    return s.required(custom.required ?? msgs.required);
  }
  return s;
}

function buildNumberValidator(field: FormField): yup.AnySchema {
  const v = field.validation ?? {};
  const msgs = defaultMessages(field.label);
  const custom = v.messages ?? {};

  let n = yup
    .number()
    .transform((value: unknown, original: unknown) =>
      original === '' || original === null || original === undefined ? null : value,
    )
    .nullable()
    .typeError(custom.pattern ?? msgs.type);

  if (v.min !== undefined) {
    n = n.min(v.min, custom.min ?? msgs.min(v.min));
  }
  if (v.max !== undefined) {
    n = n.max(v.max, custom.max ?? msgs.max(v.max));
  }
  if (v.required) {
    return n.required(custom.required ?? msgs.required);
  }
  return n;
}

function buildArrayValidator(field: FormField): yup.AnySchema {
  const v = field.validation ?? {};
  const msgs = defaultMessages(field.label);
  const custom = v.messages ?? {};

  let a = yup.array().of(yup.string().required()).default([]);

  if (v.min !== undefined) {
    a = a.min(v.min, custom.min ?? msgs.min(v.min));
  }
  if (v.max !== undefined) {
    a = a.max(v.max, custom.max ?? msgs.max(v.max));
  }
  if (v.required) {
    return a.min(1, custom.required ?? msgs.required);
  }
  return a;
}

function buildFieldValidator(field: FormField): yup.AnySchema {
  if (field.type === 'input' && field.inputType === 'number') {
    return buildNumberValidator(field);
  }
  if (field.type === 'checkbox') {
    return buildArrayValidator(field);
  }
  return buildStringValidator(field);
}

/** Build a Yup object schema covering every field in a form page,
 *  including conditionally-revealed nested fields (radio/checkbox
 *  `option.conditional`). */
export function buildYupSchema(fields: FormField[]): yup.ObjectSchema<Record<string, unknown>> {
  const shape: Record<string, yup.AnySchema> = {};
  for (const field of flattenFields(fields)) {
    shape[field.id] = buildFieldValidator(field);
  }
  return yup.object().shape(shape) as yup.ObjectSchema<Record<string, unknown>>;
}

/**
 * Validate a payload against a Yup schema, collecting every failure into a
 * fieldId → message record (shape consumed directly by ErrorSummary).
 */
export async function validateAndCollect<T extends Record<string, unknown>>(
  schema: yup.ObjectSchema<T>,
  data: Record<string, unknown>,
): Promise<ValidationResult<T>> {
  try {
    const validated = await schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });
    return { valid: true, data: validated as T };
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      for (const inner of err.inner) {
        if (inner.path && errors[inner.path] === undefined) {
          errors[inner.path] = inner.message;
        }
      }
      return { valid: false, errors };
    }
    throw err;
  }
}
