import { describe, expect, it } from 'vitest';

import type { FormField } from '../types/schema.types';
import { formDataToAnswers } from './request.utils';

const fields: FormField[] = [
  { id: 'firstName', type: 'input', label: 'First name' },
  { id: 'age', type: 'input', inputType: 'number', label: 'Age' },
  {
    id: 'interests',
    type: 'checkbox',
    label: 'Interests',
    options: [
      { value: 'sports', label: 'Sports' },
      { value: 'music', label: 'Music' },
    ],
  },
  { id: 'dob', type: 'datepicker', label: 'Date of birth' },
];

describe('request.utils — formDataToAnswers', () => {
  it('extracts plain string fields', () => {
    const fd = new FormData();
    fd.set('firstName', 'Ada');
    expect(formDataToAnswers(fd, fields).firstName).toBe('Ada');
  });

  it('coerces numeric inputs', () => {
    const fd = new FormData();
    fd.set('age', '30');
    expect(formDataToAnswers(fd, fields).age).toBe(30);
  });

  it('preserves the raw string when number coercion fails', () => {
    const fd = new FormData();
    fd.set('age', 'thirty');
    expect(formDataToAnswers(fd, fields).age).toBe('thirty');
  });

  it('gathers multi-checkbox values into an array', () => {
    const fd = new FormData();
    fd.append('interests', 'sports');
    fd.append('interests', 'music');
    expect(formDataToAnswers(fd, fields).interests).toEqual(['sports', 'music']);
  });

  it('omits fields that are absent in the FormData', () => {
    const fd = new FormData();
    fd.set('firstName', 'Ada');
    const out = formDataToAnswers(fd, fields);
    expect(out).toEqual({ firstName: 'Ada', interests: [] });
  });

  it('combines day/month/year inputs into an ISO date for datepicker fields', () => {
    const fd = new FormData();
    fd.set('dob', ''); // ignored — datepicker uses dob-day/-month/-year
    fd.set('dob-day', '5');
    fd.set('dob-month', '1');
    fd.set('dob-year', '1978');
    expect(formDataToAnswers(fd, fields).dob).toBe('1978-01-05');
  });

  it('omits a datepicker field whose three inputs are all empty', () => {
    const fd = new FormData();
    fd.set('dob-day', '');
    fd.set('dob-month', '');
    fd.set('dob-year', '');
    expect(formDataToAnswers(fd, fields)).not.toHaveProperty('dob');
  });
});
