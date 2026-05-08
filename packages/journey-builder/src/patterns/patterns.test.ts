/**
 * Each pattern, when applied to a fresh project, must:
 *   1. produce schemas that round-trip cleanly through the canvas mapper
 *      (schemaToCanvas → canvasToSchema is byte-equivalent)
 *   2. produce no validation errors (warnings are OK — patterns leave
 *      placeholders the user retargets)
 *
 * That keeps the pattern library trustworthy: BAs drop one in and the
 * authoring tools never lie about its state.
 */

import { describe, expect, it } from 'vitest';

import { canvasToSchema, formOrderOf, schemaToCanvas } from '../schema';
import { buildProjectJourney, type Project, type ProjectJourney } from '../store';
import { validateProject } from '../validation/checks';
import { PATTERNS } from './index';

function emptyProject(jid: string): Project {
  return {
    applicationId: 'demo',
    taskList: { title: 'Sample' },
    journeys: {
      [jid]: buildProjectJourney({ journeyId: jid, forms: [] }),
    },
  };
}

function applyPattern(
  project: Project,
  jid: string,
  patternId: string,
): Project {
  const pattern = PATTERNS.find((p) => p.id === patternId)!;
  const journey = project.journeys[jid]!;
  const existingIds = {
    formIds: new Set<string>(),
    hubIds: new Set<string>(),
    taskListIds: new Set<string>(),
    journeyIds: new Set(Object.keys(project.journeys)),
  };
  const result = pattern.apply(jid, { x: 100, y: 100 }, existingIds);

  const nextForms = [...journey.formSchema.forms];
  const nextOrder = [...journey.formOrder];
  for (const spec of result.pages ?? []) {
    nextForms.push(spec.page);
    if (spec.page.type === undefined || spec.page.type === 'form') {
      nextOrder.push((spec.page as { formId: string }).formId);
    }
  }
  const updatedJourney: ProjectJourney = {
    ...journey,
    formSchema: { ...journey.formSchema, forms: nextForms },
    formOrder: nextOrder,
    ...(result.summarySchema ? { summarySchema: result.summarySchema } : {}),
  };
  const journeys = { ...project.journeys, [jid]: updatedJourney };
  for (const nj of result.newJourneys ?? []) {
    journeys[nj.journeyId] = buildProjectJourney(nj.formSchema, nj.summarySchema);
  }
  return { ...project, journeys };
}

describe('pattern library', () => {
  for (const pattern of PATTERNS) {
    it(`${pattern.id}: round-trips`, () => {
      const project = applyPattern(emptyProject('host'), 'host', pattern.id);
      // Round-trip every journey.
      for (const [jid, j] of Object.entries(project.journeys)) {
        const { nodes, edges } = schemaToCanvas({
          formSchema: j.formSchema,
          ...(j.summarySchema ? { summarySchema: j.summarySchema } : {}),
        });
        const back = canvasToSchema({
          journeyId: jid,
          nodes,
          edges,
          formOrder: formOrderOf(j.formSchema),
          ...(j.formSchema.looping ? { looping: j.formSchema.looping } : {}),
        });
        expect(back.formSchema).toEqual(j.formSchema);
        if (j.summarySchema) expect(back.summarySchema).toEqual(j.summarySchema);
      }
    });

    it(`${pattern.id}: produces no validation errors`, () => {
      const project = applyPattern(emptyProject('host'), 'host', pattern.id);
      const errors = validateProject(project).filter((i) => i.severity === 'error');
      expect(errors).toEqual([]);
    });
  }
});
