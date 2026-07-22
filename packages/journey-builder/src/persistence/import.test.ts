/**
 * Import must be file-order independent: zips list entries in arbitrary
 * order, and a summary-schema.json read before its form-schemas.json used
 * to leave the placeholder journey's empty formOrder in place — canvas
 * looked fine but round-trip/export silently dropped every form.
 */

import { describe, expect, it } from 'vitest';

import type { FormSchema, SummarySchema } from '../schema';
import { roundTripSchemas } from '../store';
import { importProjectFromFiles } from './import';

const formSchema: FormSchema = {
  journeyId: 'your-details',
  forms: [
    {
      formId: 'name-page',
      title: 'What is your name?',
      fields: [
        { id: 'firstName', type: 'input', label: 'First name', validation: { required: true } },
      ],
      next: 'summary',
    },
  ],
};

const summarySchema: SummarySchema = {
  journeyId: 'your-details',
  title: 'Check your answers',
  headerRows: [
    { key: 'First name', valueFrom: 'name-page.firstName', changeLink: 'name-page' },
  ],
  next: 'task-list',
};

function asFile(name: string, data: unknown): File {
  return new File([JSON.stringify(data)], name, { type: 'application/json' });
}

describe('importProjectFromFiles', () => {
  it('is order-independent: summary before forms still yields a full formOrder', async () => {
    const project = await importProjectFromFiles([
      asFile('summary-schema.json', summarySchema),
      asFile('form-schemas.json', formSchema),
    ]);
    const journey = project.journeys['your-details']!;
    expect(journey.formOrder).toEqual(['name-page']);
    expect(journey.summarySchema).toEqual(summarySchema);

    // Round-trip must preserve the imported schema verbatim.
    const back = roundTripSchemas('your-details', journey);
    expect(back.formSchema).toEqual(formSchema);
    expect(back.summarySchema).toEqual(summarySchema);
  });

  it('forms before summary behaves identically', async () => {
    const project = await importProjectFromFiles([
      asFile('form-schemas.json', formSchema),
      asFile('summary-schema.json', summarySchema),
    ]);
    const journey = project.journeys['your-details']!;
    expect(journey.formOrder).toEqual(['name-page']);
    expect(roundTripSchemas('your-details', journey).formSchema).toEqual(formSchema);
  });
});
