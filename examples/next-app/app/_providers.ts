/**
 * Server-side options providers for select fields whose JSON schemas use
 * `dataSource`. Each provider is a (param) => FieldOption[] function the
 * engine calls at form render time and again at submit time (to persist
 * the picked option's label alongside its value).
 *
 * The mock postcode lookup below stands in for a real address API. Swap
 * the implementation freely — the schema, engine, and pages don't change.
 */

import { registerOptionsProvider } from 'teleportal-gds';
import type { FieldOption } from 'teleportal-gds';

const FIXTURES: Record<string, FieldOption[]> = {
  'ST1 7NL': [
    { value: 'st1-7nl-1', label: '1 Orchard Road, Strawford, ST1 7NL' },
    { value: 'st1-7nl-2', label: '2 Orchard Road, Strawford, ST1 7NL' },
    { value: 'st1-7nl-3', label: '3 Orchard Road, Strawford, ST1 7NL' },
    { value: 'st1-7nl-flat', label: 'Flat 4, Orchard House, Strawford, ST1 7NL' },
  ],
  'SW1A 1AA': [{ value: 'sw1a-1aa-1', label: 'Buckingham Palace, London, SW1A 1AA' }],
  'EC1A 1BB': [
    { value: 'ec1a-1bb-1', label: '1 Aldersgate Street, London, EC1A 1BB' },
    { value: 'ec1a-1bb-2', label: '2 Aldersgate Street, London, EC1A 1BB' },
  ],
};

function normalise(postcode: string): string {
  return postcode.trim().toUpperCase().replace(/\s+/g, ' ');
}

let registered = false;

export function ensureProvidersRegistered(): void {
  if (registered) return;
  registered = true;

  registerOptionsProvider('postcode-address-lookup', (postcode) => {
    const key = normalise(postcode);
    if (!key) return [];
    if (FIXTURES[key]) return FIXTURES[key];
    return Array.from({ length: 5 }).map((_, i) => ({
      value: `${key.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
      label: `${i + 1} Sample Street, Demo Town, ${key}`,
    }));
  });
}
