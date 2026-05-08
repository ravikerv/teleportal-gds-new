/**
 * Looping collection with summary. Reproduces the occupier-of-the-land /
 * occupier-details pattern from the demo:
 *
 *   - Adds a Yes/No radio form on the current journey
 *     (`{prefix}-yes-no`) that branches No → `add-instance:{loopJid}`.
 *   - Adds a SummarySchema on the current journey enumerating the new
 *     looping journey's entries (with `showWhen` gated on the radio).
 *   - Creates a NEW looping journey (`{prefix}-details`) with two
 *     forms (details-page + consent-page) and `looping.parentJourneyId`
 *     pointing back at the current journey.
 *
 * After the drop the user retargets the radio's default Yes path (set
 * to 'task-list' here) and renames the form ids to taste.
 */

import type {
  FormPage,
  FormSchema,
  SummarySchema,
} from '../schema';
import { uniqueId, type Pattern, type PatternResult } from './types';

export const loopingCollectionPattern: Pattern = {
  id: 'looping-collection',
  label: 'Looping collection',
  description: 'Yes/No → looping child journey → summary with Add another / Remove',
  apply: (currentJourneyId, dropPos, existingIds): PatternResult => {
    // Mint ids that don't collide on either the current journey or the
    // project's journey list.
    const radioId = uniqueId(existingIds.formIds, 'choose');
    const localFormIds = new Set([...existingIds.formIds, radioId]);
    const detailsId = uniqueId(localFormIds, 'details-page');
    localFormIds.add(detailsId);
    const consentId = uniqueId(localFormIds, 'consent-page');

    const loopJid = uniqueId(existingIds.journeyIds, `${currentJourneyId}-details`);

    // Current-journey radio that branches on No.
    const radio: FormPage = {
      formId: radioId,
      title: 'Are you the X?',
      fields: [
        {
          id: 'isX',
          type: 'radio',
          label: 'Are you the X?',
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
          validation: {
            required: true,
            messages: { required: 'Select yes or no' },
          },
        },
      ],
      next: 'summary',
      nextWhen: [{ fieldId: 'isX', value: 'no', then: `add-instance:${loopJid}` }],
    };

    // Current-journey summary with looping entries block.
    const summary: SummarySchema = {
      journeyId: currentJourneyId,
      title: 'Check your answers',
      back: 'task-list',
      next: 'task-list',
      headerRows: [
        {
          key: 'Are you the X?',
          valueFrom: `${radioId}.isX`,
          changeLink: radioId,
        },
      ],
      entries: {
        fromJourneyId: loopJid,
        groupLabel: 'Item {n}',
        addAnotherLabel: 'Add another item',
        removeLabel: 'Remove',
        showWhen: { valueFrom: `${radioId}.isX`, equals: 'no' },
        rows: [
          {
            key: "Item's name",
            valueFromAll: [`${detailsId}.firstName`, `${detailsId}.lastName`],
            valueFrom: `${detailsId}.firstName`,
            changeFormId: detailsId,
          },
          {
            key: 'Email address',
            valueFrom: `${detailsId}.email`,
            changeFormId: detailsId,
          },
          {
            key: 'Phone number',
            valueFrom: `${detailsId}.phone`,
            changeFormId: detailsId,
          },
          {
            key: 'Consent given?',
            valueFrom: `${consentId}.hasConsent`,
            changeFormId: consentId,
          },
        ],
      },
      submitLabel: 'Continue',
    };

    // Brand-new looping journey.
    const loopingFormSchema: FormSchema = {
      journeyId: loopJid,
      looping: { parentJourneyId: currentJourneyId },
      forms: [
        {
          formId: detailsId,
          title: "Add the item's details",
          fields: [
            { id: 'firstName', type: 'input', label: 'First name', autocomplete: 'given-name', validation: { required: true, maxLength: 50 } },
            { id: 'lastName', type: 'input', label: 'Last name', autocomplete: 'family-name', validation: { required: true, maxLength: 50 } },
            {
              id: 'email',
              type: 'input',
              inputType: 'email',
              label: 'Email address',
              autocomplete: 'email',
              validation: {
                required: true,
                pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
                messages: { pattern: 'Enter an email address in the correct format' },
              },
            },
            { id: 'phone', type: 'input', inputType: 'tel', label: 'Phone number', autocomplete: 'tel', validation: { required: true, minLength: 6, maxLength: 20 } },
          ],
          back: 'parent-summary',
          next: consentId,
        },
        {
          formId: consentId,
          title: 'Did you get consent?',
          fields: [
            {
              id: 'hasConsent',
              type: 'radio',
              label: 'Did you get consent?',
              options: [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ],
              validation: { required: true, messages: { required: 'Select yes or no' } },
            },
          ],
          back: detailsId,
          next: 'parent-summary',
        },
      ],
    };

    return {
      pages: [{ page: radio, position: dropPos }],
      summarySchema: summary,
      summaryPosition: { x: dropPos.x + 320, y: dropPos.y + 60 },
      newJourneys: [
        {
          journeyId: loopJid,
          formSchema: loopingFormSchema,
          layout: {
            [detailsId]: { x: 100, y: 100 },
            [consentId]: { x: 400, y: 100 },
          },
        },
      ],
      selectAfter: radioId,
    };
  },
};
