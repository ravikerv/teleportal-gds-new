/**
 * Cross-cutting constants. Path builders mirror the blob layout in
 * ARCHITECTURE.md §7 and are the single source of truth for any code
 * that needs to address a blob.
 */

import type { FieldType, SchemaType, TaskStatus } from '../types/schema.types';
import type { ComponentType } from '../types/component.types';

export const SCHEMA_TYPES = {
  FORM: 'form',
  SUMMARY: 'summary',
  TASK_LIST: 'task-list',
  CONFIRMATION: 'confirmation',
  HUB: 'hub',
} as const satisfies Record<string, SchemaType>;

export const FIELD_TYPES = {
  INPUT: 'input',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  DATEPICKER: 'datepicker',
  TEXTAREA: 'textarea',
} as const satisfies Record<string, FieldType>;

export const COMPONENT_TYPES = {
  ...FIELD_TYPES,
  BUTTON: 'button',
  ERROR_SUMMARY: 'error-summary',
  SUMMARY_LIST: 'summary-list',
  TASK_LIST: 'task-list',
} as const satisfies Record<string, ComponentType>;

export const TASK_STATUSES = {
  NOT_STARTED: 'not-started',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANNOT_START: 'cannot-start',
} as const satisfies Record<string, TaskStatus>;

/**
 * Blob path builders. Folder layout mirrors Next.js routing so
 * URLs, code paths, and blob keys all align (ARCHITECTURE.md §7).
 */
export const BLOB_PATHS = {
  parent: (applicationId: string): string => `applications/${applicationId}/parent.json`,
  taskListSchema: (applicationId: string): string =>
    `applications/${applicationId}/schemas/task-list-schema.json`,
  journeyFormSchemas: (applicationId: string, journeyId: string): string =>
    `applications/${applicationId}/schemas/journeys/${journeyId}/form-schemas.json`,
  journeySummarySchema: (applicationId: string, journeyId: string): string =>
    `applications/${applicationId}/schemas/journeys/${journeyId}/summary-schema.json`,
  journeyConfirmationSchema: (applicationId: string, journeyId: string): string =>
    `applications/${applicationId}/schemas/journeys/${journeyId}/confirmation-schema.json`,
  journeyData: (applicationId: string, journeyId: string): string =>
    `applications/${applicationId}/data/journeys/${journeyId}.json`,
  /**
   * Transient per-form-page state used to round-trip validation errors
   * (and the user's just-typed values) back to the page on a re-render.
   * Read-once: cleared on the next successful submit.
   */
  journeyFormDraft: (applicationId: string, journeyId: string, formId: string): string =>
    `applications/${applicationId}/data/journeys/${journeyId}/_drafts/${formId}.json`,
} as const;
