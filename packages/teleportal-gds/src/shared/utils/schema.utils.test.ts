import { describe, expect, it } from 'vitest';

import type { FormSchema } from '../types/schema.types';
import { findFormPage, getFields, getFirstFormPage, getNextToken, listFormIds } from './schema.utils';

const schema: FormSchema = {
  journeyId: 'personal-details',
  forms: [
    {
      formId: 'name-page',
      title: 'What is your name?',
      fields: [
        { id: 'firstName', type: 'input', label: 'First name', validation: { required: true } },
      ],
      next: 'dob-page',
    },
    {
      formId: 'dob-page',
      title: 'When were you born?',
      fields: [{ id: 'dob', type: 'datepicker', label: 'DOB' }],
      next: 'summary',
    },
  ],
};

describe('schema.utils', () => {
  it('findFormPage returns the matching page', () => {
    expect(findFormPage(schema, 'dob-page')?.title).toBe('When were you born?');
  });

  it('findFormPage returns undefined for unknown formId', () => {
    expect(findFormPage(schema, 'nope')).toBeUndefined();
  });

  it('getFirstFormPage returns the entry page', () => {
    expect(getFirstFormPage(schema)?.formId).toBe('name-page');
  });

  it('getNextToken returns the declared next', () => {
    expect(getNextToken(schema, 'dob-page')).toBe('summary');
  });

  it('getFields returns the page fields, or empty when missing', () => {
    expect(getFields(schema, 'name-page')).toHaveLength(1);
    expect(getFields(schema, 'unknown-page')).toEqual([]);
  });

  it('listFormIds preserves authoring order', () => {
    expect(listFormIds(schema)).toEqual(['name-page', 'dob-page']);
  });
});
