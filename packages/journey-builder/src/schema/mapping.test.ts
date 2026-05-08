/**
 * Round-trip the bidirectional mapper against real fixtures: load a
 * schema, derive the canvas, push it back through canvasToSchema, and
 * assert byte-equivalence against the original. This locks the contract
 * — any drift in mapper logic (or schema shape) trips here.
 *
 * We cover all four journeys we ship in the demo so M4's wider tree
 * doesn't introduce silent regressions.
 */

import { describe, expect, it } from 'vitest';

import type { FormSchema, SummarySchema } from 'teleportal-gds';
import activitiesForms from '../fixtures/activities.form-schemas.json' with { type: 'json' };
import contactDetailsForms from '../fixtures/contact-details.form-schemas.json' with { type: 'json' };
import occupierDetailsForms from '../fixtures/occupier-details.form-schemas.json' with { type: 'json' };
import occupierOfTheLandForms from '../fixtures/occupier-of-the-land.form-schemas.json' with { type: 'json' };
import occupierOfTheLandSummary from '../fixtures/occupier-of-the-land.summary-schema.json' with { type: 'json' };

import { canvasToSchema, formOrderOf, schemaToCanvas } from './mapping';

function roundTrip(formSchema: FormSchema, summarySchema?: SummarySchema) {
  const { nodes, edges } = schemaToCanvas({
    formSchema,
    ...(summarySchema ? { summarySchema } : {}),
  });
  return canvasToSchema({
    journeyId: formSchema.journeyId,
    nodes,
    edges,
    formOrder: formOrderOf(formSchema),
    ...(formSchema.looping ? { looping: formSchema.looping } : {}),
    ...(formSchema.schemaVersion ? { schemaVersion: formSchema.schemaVersion } : {}),
  });
}

describe('schema mapping round-trip', () => {
  it('preserves contact-details form-schemas verbatim', () => {
    const source = contactDetailsForms as FormSchema;
    expect(roundTrip(source).formSchema).toEqual(source);
  });

  it('preserves activities (sub-task-list) form-schemas verbatim', () => {
    const source = activitiesForms as FormSchema;
    expect(roundTrip(source).formSchema).toEqual(source);
  });

  it('preserves occupier-of-the-land (form + summary) verbatim', () => {
    const source = occupierOfTheLandForms as FormSchema;
    const summary = occupierOfTheLandSummary as SummarySchema;
    const back = roundTrip(source, summary);
    expect(back.formSchema).toEqual(source);
    expect(back.summarySchema).toEqual(summary);
  });

  it('preserves occupier-details (looping) form-schemas verbatim', () => {
    const source = occupierDetailsForms as FormSchema;
    expect(roundTrip(source).formSchema).toEqual(source);
  });
});
