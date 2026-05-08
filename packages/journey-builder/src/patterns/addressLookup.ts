/**
 * Postcode → address-select with manual fallback. Drops three forms,
 * already wired:
 *   1. {postcode} (input) → next: addressSelect
 *   2. {addressSelect} (select with `dataSource`) → next: 'task-list',
 *      `redirectIfMissing` to bounce users who skip step 1, plus a
 *      `secondaryLink` to the manual entry form
 *   3. {manual} (line1, line2, town, county, postcode) → next: 'task-list'
 *
 * The user is expected to register a real options provider (e.g.
 * postcode-address-lookup) on the consumer side.
 */

import type { FormPage } from '../schema';
import { uniqueId, type Pattern, type PatternResult } from './types';

export const addressLookupPattern: Pattern = {
  id: 'address-lookup',
  label: 'Address lookup',
  description: 'Postcode → select address (with dataSource) + manual fallback',
  apply: (_journeyId, dropPos, existingIds): PatternResult => {
    const postcodeId = uniqueId(existingIds.formIds, 'postcode');
    const ids = new Set([...existingIds.formIds, postcodeId]);
    const selectId = uniqueId(ids, 'address-select');
    ids.add(selectId);
    const manualId = uniqueId(ids, 'address-manual');

    const postcode: FormPage = {
      formId: postcodeId,
      title: 'What is the postcode?',
      fields: [
        {
          id: 'postcode',
          type: 'input',
          label: 'Postcode',
          autocomplete: 'postal-code',
          hint: 'For example, SW1A 1AA',
          validation: {
            required: true,
            pattern: '^[A-Za-z]{1,2}[0-9][A-Za-z0-9]?\\s*[0-9][A-Za-z]{2}$',
            messages: { pattern: 'Enter a valid UK postcode' },
          },
        },
      ],
      next: selectId,
      submitLabel: 'Find address',
    };

    const select: FormPage = {
      formId: selectId,
      title: 'Choose the address',
      redirectIfMissing: { valueFrom: `${postcodeId}.postcode`, to: postcodeId },
      fields: [
        {
          id: 'addressId',
          type: 'select',
          label: 'Select an address',
          dataSource: {
            providerId: 'postcode-address-lookup',
            paramFrom: `${postcodeId}.postcode`,
          },
          validation: {
            required: true,
            messages: { required: 'Select an address from the list' },
          },
        },
      ],
      back: postcodeId,
      next: 'task-list',
      secondaryLinks: [
        { text: 'Enter the address manually', href: manualId },
      ],
    };

    const manual: FormPage = {
      formId: manualId,
      title: 'Enter the address',
      fields: [
        { id: 'line1', type: 'input', label: 'Address line 1', autocomplete: 'address-line1', validation: { required: true, maxLength: 100 } },
        { id: 'line2', type: 'input', label: 'Address line 2 (optional)', autocomplete: 'address-line2', validation: { maxLength: 100 } },
        { id: 'town', type: 'input', label: 'Town or city', autocomplete: 'address-level2', validation: { required: true, maxLength: 60 } },
        { id: 'county', type: 'input', label: 'County (optional)', autocomplete: 'address-level1', validation: { maxLength: 60 } },
        {
          id: 'postcode',
          type: 'input',
          label: 'Postcode',
          autocomplete: 'postal-code',
          validation: {
            required: true,
            pattern: '^[A-Za-z]{1,2}[0-9][A-Za-z0-9]?\\s*[0-9][A-Za-z]{2}$',
            messages: { pattern: 'Enter a valid UK postcode' },
          },
        },
      ],
      back: selectId,
      next: 'task-list',
    };

    return {
      pages: [
        { page: postcode, position: dropPos },
        { page: select, position: { x: dropPos.x + 280, y: dropPos.y } },
        { page: manual, position: { x: dropPos.x + 560, y: dropPos.y + 120 } },
      ],
      selectAfter: postcodeId,
    };
  },
};
