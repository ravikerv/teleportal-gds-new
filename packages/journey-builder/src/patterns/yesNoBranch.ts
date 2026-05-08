/**
 * Yes / No radio with a `nextWhen` branch. Drops a single form whose
 * radio answer routes the user differently:
 *   - default `next` (Yes path) → 'task-list'
 *   - `nextWhen { isYes: 'no' → 'TODO-no-path' }` (the user retargets via the inspector)
 */

import type { FormPage } from '../schema';
import { uniqueId, type Pattern, type PatternResult } from './types';

export const yesNoBranchPattern: Pattern = {
  id: 'yes-no-branch',
  label: 'Yes / No question',
  description: 'Radio with two options + a nextWhen branch on No',
  apply: (_journeyId, dropPos, existingIds): PatternResult => {
    const formId = uniqueId(existingIds.formIds, 'choose');
    const page: FormPage = {
      formId,
      title: 'Are you sure?',
      fields: [
        {
          id: 'isYes',
          type: 'radio',
          label: 'Are you sure?',
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
          validation: {
            required: true,
            messages: { required: 'Select Yes or No' },
          },
        },
      ],
      next: 'task-list',
      nextWhen: [{ fieldId: 'isYes', value: 'no', then: 'task-list' }],
    };
    return {
      pages: [{ page, position: dropPos }],
      selectAfter: formId,
    };
  },
};
