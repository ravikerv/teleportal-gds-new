/**
 * Request-shaped helpers. Two responsibilities:
 *   - formDataToAnswers: turn an incoming Server Action FormData into a
 *     typed FormAnswers object based on the field schema (handles
 *     multi-checkbox arrays + number coercion).
 *   - fetchJson: thin GET/POST helper for any external HTTP calls
 *     consumers want to make from server actions.
 */

import type { FormField } from '../types/schema.types';
import type { FormAnswers } from '../types/journey.types';
import { flattenFields } from './schema.utils';

export function formDataToAnswers(formData: FormData, fields: FormField[]): FormAnswers {
  const out: FormAnswers = {};
  for (const field of flattenFields(fields)) {
    if (field.type === 'checkbox') {
      const all = formData.getAll(field.id);
      out[field.id] = all.filter((v): v is string => typeof v === 'string');
      continue;
    }
    if (field.type === 'datepicker') {
      // GovUK date input renders three text fields. Combine into ISO YYYY-MM-DD.
      const day = formData.get(`${field.id}-day`);
      const month = formData.get(`${field.id}-month`);
      const year = formData.get(`${field.id}-year`);
      const d = typeof day === 'string' ? day.trim() : '';
      const m = typeof month === 'string' ? month.trim() : '';
      const y = typeof year === 'string' ? year.trim() : '';
      if (d === '' && m === '' && y === '') continue;
      out[field.id] = `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      continue;
    }
    const raw = formData.get(field.id);
    if (raw === null) continue;
    if (typeof raw !== 'string') continue; // file uploads not supported in step 3
    if (field.type === 'input' && field.inputType === 'number') {
      const trimmed = raw.trim();
      if (trimmed === '') continue;
      const n = Number(trimmed);
      out[field.id] = Number.isNaN(n) ? trimmed : n;
      continue;
    }
    out[field.id] = raw;
  }
  return out;
}

export type FetchJsonInit = RequestInit & {
  /** Defaults to 'application/json' for non-GET requests when a body is present. */
  contentType?: string;
};

/** Thin fetch wrapper that always parses JSON and throws on non-2xx. */
export async function fetchJson<T>(url: string, init?: FetchJsonInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', init.contentType ?? 'application/json');
  }
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}
