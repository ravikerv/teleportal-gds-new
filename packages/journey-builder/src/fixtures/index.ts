/**
 * Hard-coded sample project for M4 — covers the same four journeys we
 * built end-to-end in the runtime app: contact-details (hub), activities
 * (sub-task-list), occupier-of-the-land (form + summary with looping),
 * and occupier-details (looping). M7 will replace this with file/zip
 * import.
 */

import type { FormSchema, SummarySchema, TaskListSchema } from 'teleportal-gds';

import { buildProjectJourney, type Project } from '../store';
import activitiesForms from './activities.form-schemas.json';
import contactDetailsForms from './contact-details.form-schemas.json';
import occupierDetailsForms from './occupier-details.form-schemas.json';
import occupierOfTheLandForms from './occupier-of-the-land.form-schemas.json';
import occupierOfTheLandSummary from './occupier-of-the-land.summary-schema.json';
import taskList from './task-list-schema.json';

export function loadFixtureProject(): Project {
  return {
    applicationId: 'demo',
    taskList: taskList as TaskListSchema,
    journeys: {
      'contact-details': buildProjectJourney(contactDetailsForms as FormSchema),
      activities: buildProjectJourney(activitiesForms as FormSchema),
      'occupier-of-the-land': buildProjectJourney(
        occupierOfTheLandForms as FormSchema,
        occupierOfTheLandSummary as SummarySchema,
      ),
      'occupier-details': buildProjectJourney(occupierDetailsForms as FormSchema),
    },
  };
}
