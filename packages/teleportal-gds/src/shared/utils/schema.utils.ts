/**
 * Schema parsing & traversal helpers. The renderer + engine layer
 * always reach into schemas through these — never by hand.
 */

import type {
  FormPage,
  FormSchema,
  FormField,
  HubPage,
  JourneyPage,
  TaskListJourneyPage,
} from '../types/schema.types';

function isFormPage(page: JourneyPage): page is FormPage {
  return page.type === undefined || page.type === 'form';
}

function isHubPage(page: JourneyPage): page is HubPage {
  return page.type === 'hub';
}

function isTaskListPage(page: JourneyPage): page is TaskListJourneyPage {
  return page.type === 'task-list';
}

/** Find a form page by id. O(n) over forms; that's fine — schemas are small. */
export function findFormPage(schema: FormSchema, formId: string): FormPage | undefined {
  return schema.forms.find(
    (p): p is FormPage => isFormPage(p) && p.formId === formId,
  );
}

/**
 * Find the journey's hub page (the manage-page rendered at the journey
 * root). Returns the first hub-typed entry, or undefined if the journey
 * has none.
 */
export function findHubPage(schema: FormSchema): HubPage | undefined {
  return schema.forms.find(isHubPage);
}

/** Find the journey's task-list page (rendered at the journey root). */
export function findTaskListPage(schema: FormSchema): TaskListJourneyPage | undefined {
  return schema.forms.find(isTaskListPage);
}

/**
 * First form-type page of a journey — i.e. the entry point when the
 * journey has no hub / task-list / summary at the root. Hub-style and
 * task-list pages are skipped because they aren't URL-addressable by
 * formId.
 */
export function getFirstFormPage(schema: FormSchema): FormPage | undefined {
  return schema.forms.find(isFormPage);
}

/**
 * The `next` token declared on a form page. Useful for navigation.utils
 * to resolve URLs without having to walk the whole schema each time.
 */
export function getNextToken(schema: FormSchema, currentFormId: string): string | undefined {
  return findFormPage(schema, currentFormId)?.next;
}

/** Pull the field list off a page, defaulting to []. */
export function getFields(schema: FormSchema, formId: string): FormField[] {
  return findFormPage(schema, formId)?.fields ?? [];
}

/** Every formId declared in a journey schema, preserving authoring order. */
export function listFormIds(schema: FormSchema): string[] {
  return schema.forms.filter(isFormPage).map((p) => p.formId);
}

/**
 * Walk a list of form fields and return a flat list including every
 * conditionally-revealed nested field (radio/checkbox `option.conditional`).
 * Used by validation.utils and request.utils so nested fields are
 * validated and extracted from FormData alongside their parents.
 */
export function flattenFields(fields: FormField[]): FormField[] {
  const out: FormField[] = [];
  for (const field of fields) {
    out.push(field);
    if (field.type === 'radio' || field.type === 'checkbox') {
      for (const opt of field.options) {
        if (opt.conditional && opt.conditional.length > 0) {
          out.push(...flattenFields(opt.conditional));
        }
      }
    }
  }
  return out;
}
