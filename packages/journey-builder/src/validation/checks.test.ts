/**
 * Sanity tests for the validation engine. The reference fixture (the
 * full demo project we ship) should have **zero** errors — that's the
 * floor we're guarding against regressions.
 *
 * Plus a few negative cases proving each check fires when expected.
 */

import { describe, expect, it } from 'vitest';

import { loadFixtureProject } from '../fixtures';
import { validateProject } from './checks';
import { buildProjectJourney } from '../store';
import type { FormSchema, SummarySchema, TaskListSchema } from '../schema';

describe('validateProject', () => {
  it('reports no errors on the demo fixture', () => {
    const issues = validateProject(loadFixtureProject());
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('flags an empty next token on a form', () => {
    const project = {
      applicationId: 'x',
      taskList: { title: '' } as TaskListSchema,
      journeys: {
        j1: buildProjectJourney({
          journeyId: 'j1',
          forms: [
            {
              formId: 'f1',
              title: 'Form 1',
              fields: [],
              next: '',
            },
          ],
        } as FormSchema),
      },
    };
    const errors = validateProject(project).filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain("empty 'next'");
  });

  it("flags a nextWhen rule pointing at a field that doesn't exist", () => {
    const project = {
      applicationId: 'x',
      taskList: { title: '' } as TaskListSchema,
      journeys: {
        j1: buildProjectJourney({
          journeyId: 'j1',
          forms: [
            {
              formId: 'f1',
              title: 'Form 1',
              fields: [{ id: 'real', type: 'input', label: 'Real' }],
              next: 'task-list',
              nextWhen: [{ fieldId: 'ghost', value: 'yes', then: 'task-list' }],
            },
          ],
        } as FormSchema),
      },
    };
    const messages = validateProject(project).map((i) => i.message);
    expect(messages.some((m) => m.includes("references field 'ghost'"))).toBe(true);
  });

  it('flags summary entries.fromJourneyId pointing at a non-looping journey', () => {
    const project = {
      applicationId: 'x',
      taskList: { title: '' } as TaskListSchema,
      journeys: {
        parent: buildProjectJourney(
          { journeyId: 'parent', forms: [] } as FormSchema,
          {
            journeyId: 'parent',
            title: 'Sum',
            next: 'task-list',
            entries: {
              fromJourneyId: 'child',
              groupLabel: 'Item {n}',
              addAnotherLabel: 'Add',
              rows: [],
            },
          } as SummarySchema,
        ),
        child: buildProjectJourney({ journeyId: 'child', forms: [] } as FormSchema),
      },
    };
    const errors = validateProject(project).filter((i) => i.severity === 'error');
    expect(errors.some((e) => e.message.includes('must be a looping journey'))).toBe(true);
  });
});
