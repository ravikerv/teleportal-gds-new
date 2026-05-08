/**
 * Server Actions for the engine.
 *
 * Each exported function carries a `'use server'` *function-level*
 * directive. Module-level placement was tried but tsup's ESM splitting
 * extracts the function bodies into a shared chunk where a top-level
 * directive wouldn't reach them; function-level directives travel with
 * the function regardless of which chunk it lands in.
 *
 * Flow (ARCHITECTURE.md §6.2):
 *   1. Receive FormData.
 *   2. Reload the form schema from blob (single source of truth).
 *   3. Convert FormData → typed answers (request.utils).
 *   4. Build Yup schema from the form fields and validate.
 *   5a. Invalid → persist the just-submitted values + errors as a transient
 *       draft, then redirect back to the same form page so the Server
 *       Component re-renders with errors.
 *   5b. Valid → saveAnswers (parent + per-journey atomically), clear any
 *       stale draft, redirect via navigation.utils.
 *
 * No client hooks; the only "state" is server-side blob storage.
 */

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { BLOB_PATHS } from '../shared/constants/index';
import type { FormAnswers } from '../shared/types/journey.types';
import type {
  FormPage,
  FormSchema,
} from '../shared/types/schema.types';
import {
  addEntry,
  clearDraft,
  loadOrInitParent,
  markJourneyCompleted,
  removeEntry,
  resolveValueFromPath,
  saveAnswers,
  saveDraft,
  saveEntryAnswers,
} from '../shared/utils/data.utils';
import {
  resolveInstanceFormPath,
  resolveNextPath,
} from '../shared/utils/navigation.utils';
import { resolveOptions } from '../shared/utils/options.utils';
import { formDataToAnswers } from '../shared/utils/request.utils';
import { findFormPage, getFirstFormPage } from '../shared/utils/schema.utils';
import { readBlob } from '../shared/utils/storage.utils';
import { buildYupSchema, validateAndCollect } from '../shared/utils/validation.utils';

export async function submitFormAction(
  applicationId: string,
  journeyId: string,
  formId: string,
  instanceId: string | null,
  formData: FormData,
): Promise<void> {
  'use server';
  const schemaBlob = await readBlob<FormSchema>(
    BLOB_PATHS.journeyFormSchemas(applicationId, journeyId),
  );
  const formPage = findFormPage(schemaBlob.data, formId);
  if (!formPage) {
    throw new Error(`Unknown formId: ${formId} on journey ${journeyId}`);
  }

  const answers = formDataToAnswers(formData, formPage.fields);
  const yupSchema = buildYupSchema(formPage.fields);
  const result = await validateAndCollect(yupSchema, answers);

  const samePagePath = instanceId
    ? resolveInstanceFormPath(applicationId, journeyId, formId, instanceId)
    : `/applications/${applicationId}/journeys/${journeyId}/${formId}`;

  if (!result.valid) {
    await saveDraft(applicationId, journeyId, formId, {
      values: answers,
      errors: result.errors,
    });
    redirect(samePagePath);
  }

  await annotateDataSourceLabels(applicationId, journeyId, formPage, answers);
  if (instanceId) {
    await saveEntryAnswers(applicationId, journeyId, instanceId, formId, answers);
  } else {
    await saveAnswers(applicationId, journeyId, formId, answers);
  }
  await clearDraft(applicationId, journeyId, formId);

  const nextToken = resolveNextToken(formPage, answers);
  if (nextToken.startsWith('add-instance:')) {
    const targetJid = nextToken.slice('add-instance:'.length);
    redirect(await addInstance(applicationId, targetJid));
  }
  redirect(resolveAfterSubmit(applicationId, journeyId, schemaBlob.data, instanceId, nextToken));
}

/**
 * Mint a new entry on a looping journey and return the path to its first
 * form. Shared by `submitFormAction` (when a `nextWhen` rule resolves to
 * `'add-instance:{jid}'`) and `addInstanceAction` (form-button hook from
 * the parent summary's "Add another …" link).
 */
async function addInstance(applicationId: string, targetJid: string): Promise<string> {
  const targetSchema = await readBlob<FormSchema>(
    BLOB_PATHS.journeyFormSchemas(applicationId, targetJid),
  );
  if (!targetSchema.data.looping) {
    throw new Error(
      `Journey '${targetJid}' is not a looping journey — cannot 'add-instance' on it.`,
    );
  }
  const first = getFirstFormPage(targetSchema.data);
  if (!first) throw new Error(`Looping journey '${targetJid}' has no forms.`);
  const id = await addEntry(applicationId, targetJid);
  return resolveInstanceFormPath(applicationId, targetJid, first.formId, id);
}

/**
 * Server Action invoked by the parent summary's "Add another …" form
 * button. Mints a new entry on the looping `targetJid` and redirects to
 * its first form.
 */
export async function addInstanceAction(
  applicationId: string,
  targetJid: string,
  _formData: FormData,
): Promise<void> {
  'use server';
  redirect(await addInstance(applicationId, targetJid));
}

/**
 * Server Action invoked by the engine's remove-confirmation page. Deletes
 * the named entry and redirects back to the parent summary.
 */
export async function removeInstanceAction(
  applicationId: string,
  targetJid: string,
  instanceId: string,
  _formData: FormData,
): Promise<void> {
  'use server';
  await removeEntry(applicationId, targetJid, instanceId);
  const targetSchema = await readBlob<FormSchema>(
    BLOB_PATHS.journeyFormSchemas(applicationId, targetJid),
  );
  if (!targetSchema.data.looping) {
    throw new Error(
      `Journey '${targetJid}' is not a looping journey; remove flow requires looping config.`,
    );
  }
  redirect(
    `/applications/${applicationId}/journeys/${targetSchema.data.looping.parentJourneyId}/summary`,
  );
}

/**
 * Resolve where the user goes after a successful form submit. Adds support
 * for the looping-only `'parent-summary'` token (which routes to the parent
 * journey's summary page declared via FormSchema.looping) and threads the
 * `?instance=` query through any same-journey nav target.
 */
function resolveAfterSubmit(
  applicationId: string,
  journeyId: string,
  schema: FormSchema,
  instanceId: string | null,
  nextToken: string,
): string {
  if (nextToken === 'parent-summary') {
    if (!schema.looping) {
      throw new Error(
        `'parent-summary' is only valid on a looping journey (FormSchema.looping must be set on '${journeyId}').`,
      );
    }
    return `/applications/${applicationId}/journeys/${schema.looping.parentJourneyId}/summary`;
  }
  const path = resolveNextPath(applicationId, journeyId, nextToken);
  if (instanceId && schema.looping) {
    return `${path}?instance=${encodeURIComponent(instanceId)}`;
  }
  return path;
}

/**
 * For every select field that resolved its options from a `dataSource`,
 * also persist the picked option's label under `${fieldId}_label`. This
 * lets summary / hub schemas display the human-readable label without
 * re-running the lookup at read time.
 */
async function annotateDataSourceLabels(
  applicationId: string,
  journeyId: string,
  formPage: FormPage,
  answers: FormAnswers,
): Promise<void> {
  const dataSourceFields = formPage.fields.filter(
    (f): f is typeof f & { type: 'select'; dataSource: { providerId: string; paramFrom: string } } =>
      f.type === 'select' && f.dataSource !== undefined,
  );
  if (dataSourceFields.length === 0) return;

  const { state: parent } = await loadOrInitParent(applicationId);
  for (const field of dataSourceFields) {
    const picked = answers[field.id];
    if (typeof picked !== 'string' || picked.length === 0) continue;
    const raw = resolveValueFromPath(parent, journeyId, field.dataSource.paramFrom);
    const param = typeof raw === 'string' ? raw : '';
    const opts = await resolveOptions(field.dataSource.providerId, param);
    const match = opts.find((o) => o.value === picked);
    if (match) answers[`${field.id}_label`] = match.label;
  }
}

/**
 * Walk `nextWhen` rules in declaration order; first match wins. Falls
 * back to the page's default `next` when no rule matches.
 */
function resolveNextToken(formPage: FormPage, answers: FormAnswers): string {
  if (!formPage.nextWhen) return formPage.next;
  for (const rule of formPage.nextWhen) {
    const submitted = answers[rule.fieldId];
    if (typeof submitted === 'string' && submitted === rule.value) {
      return rule.then;
    }
  }
  return formPage.next;
}

/**
 * Generic "complete this journey" action used by hub and summary submits.
 * Marks the current journey completed and redirects via the supplied
 * token (typically `'task-list'`).
 */
export async function completeJourneyAction(
  applicationId: string,
  journeyId: string,
  next: string,
  _formData: FormData,
): Promise<void> {
  'use server';
  await markJourneyCompleted(applicationId, journeyId);
  redirect(resolveNextPath(applicationId, journeyId, next));
}

/**
 * Footer button on the master task list. Bound by TaskListRenderer with
 * `applicationId`, the action's `actionId`, and `redirectTo`. The actionId
 * is reserved for future dispatch (save vs delete vs export); for now the
 * handler simply redirects so the buttons can be placed and styled from
 * JSON before the persistence logic lands.
 */
export async function taskListFooterAction(
  _applicationId: string,
  _actionId: string,
  redirectTo: string,
  _formData: FormData,
): Promise<void> {
  'use server';
  redirect(redirectTo);
}

// ---------------------------------------------------------------------------
// Cookie consent actions for <CookieBanner />.
//
// Both write a `cookie-consent` cookie (1 year, root-scoped, HttpOnly) and
// revalidate the root path so the layout re-renders without the banner.
// Consumers can read the cookie themselves to gate analytics scripts etc.
// ---------------------------------------------------------------------------

const CONSENT_COOKIE = 'cookie-consent';
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function acceptCookiesAction(_formData: FormData): Promise<void> {
  'use server';
  const c = await cookies();
  c.set(CONSENT_COOKIE, 'accepted', {
    path: '/',
    maxAge: CONSENT_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
  });
  revalidatePath('/');
}

export async function rejectCookiesAction(_formData: FormData): Promise<void> {
  'use server';
  const c = await cookies();
  c.set(CONSENT_COOKIE, 'rejected', {
    path: '/',
    maxAge: CONSENT_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
  });
  revalidatePath('/');
}
