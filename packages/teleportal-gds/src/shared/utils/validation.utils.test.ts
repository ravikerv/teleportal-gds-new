import { describe, expect, it } from 'vitest';

import type { FormField } from '../types/schema.types';
import { buildYupSchema, validateAndCollect } from './validation.utils';

const fields: FormField[] = [
  {
    id: 'firstName',
    type: 'input',
    label: 'First name',
    validation: { required: true, minLength: 2, maxLength: 30 },
  },
  {
    id: 'age',
    type: 'input',
    inputType: 'number',
    label: 'Age',
    validation: { required: true, min: 18, max: 120 },
  },
  {
    id: 'postcode',
    type: 'input',
    label: 'Postcode',
    validation: {
      pattern: '^[A-Z]{1,2}\\d{1,2} ?\\d[A-Z]{2}$',
      messages: { pattern: 'Enter a real postcode' },
    },
  },
  {
    id: 'interests',
    type: 'checkbox',
    label: 'Interests',
    options: [
      { value: 'sports', label: 'Sports' },
      { value: 'music', label: 'Music' },
    ],
    validation: { required: true },
  },
];

describe('validation.utils', () => {
  it('passes when every required rule is satisfied', async () => {
    const schema = buildYupSchema(fields);
    const result = await validateAndCollect(schema, {
      firstName: 'Ada',
      age: 30,
      postcode: 'SW1 1AA',
      interests: ['sports'],
    });
    expect(result.valid).toBe(true);
  });

  it('collects every failure with default messages', async () => {
    const schema = buildYupSchema(fields);
    const result = await validateAndCollect(schema, {
      firstName: 'A',
      age: 5,
      postcode: 'NOT-A-POSTCODE',
      interests: [],
    });
    if (result.valid) throw new Error('expected validation to fail');
    expect(result.errors.firstName).toContain('at least 2');
    expect(result.errors.age).toContain('at least 18');
    expect(result.errors.postcode).toBe('Enter a real postcode');
    expect(result.errors.interests).toBe('Interests is required');
  });

  it('reports required errors for missing values', async () => {
    const schema = buildYupSchema(fields);
    const result = await validateAndCollect(schema, {});
    if (result.valid) throw new Error('expected validation to fail');
    expect(result.errors.firstName).toBe('First name is required');
    expect(result.errors.age).toBe('Age is required');
    expect(result.errors.interests).toBe('Interests is required');
  });

  it('treats optional-empty values as valid', async () => {
    const optionalField: FormField = {
      id: 'middleName',
      type: 'input',
      label: 'Middle name',
      validation: { minLength: 3 },
    };
    const schema = buildYupSchema([optionalField]);
    const result = await validateAndCollect(schema, { middleName: '' });
    expect(result.valid).toBe(true);
  });

  it('honours custom required message', async () => {
    const customField: FormField = {
      id: 'foo',
      type: 'input',
      label: 'Foo',
      validation: { required: true, messages: { required: 'Tell us your foo' } },
    };
    const schema = buildYupSchema([customField]);
    const result = await validateAndCollect(schema, {});
    if (result.valid) throw new Error('expected validation to fail');
    expect(result.errors.foo).toBe('Tell us your foo');
  });
});
