/**
 * Server Component that renders a single form page from a JSON schema:
 *   - ErrorSummary at the top when the prior submit failed validation
 *   - Page heading from `schema.title`
 *   - Optional `description` paragraph below the title
 *   - Each `field` rendered via componentRegistry.renderField, with the
 *     pre-fill value, inline error, and any server-resolved options pulled
 *     from `values` / `errors` / `dataSources`
 *   - Submit button posting to `submitFormAction`, label from
 *     prop / schema.submitLabel / "Save and continue" (in that order)
 *   - Optional `secondaryLinks` rendered below the submit button
 *
 * Pair with `loadFormPageState` (also exported from this module) so the
 * consuming Next.js page component is a single async call. The loader
 * also evaluates `schema.redirectIfMissing` and bounces the user on the
 * server when a prerequisite is absent.
 */

import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';

import type { ErrorSummaryItem } from '../components/ErrorSummary';
import { getDesignSystem } from '../design-systems/registry';
import { BLOB_PATHS } from '../shared/constants/index';
import type { FormAnswers } from '../shared/types/journey.types';
import type { FieldOption, FormPage, FormSchema } from '../shared/types/schema.types';
import {
  consumeDraft,
  findEntry,
  loadJourney,
  loadOrInitParent,
  resolveValueFromPath,
} from '../shared/utils/data.utils';
import {
  resolveBackPath,
  resolveNextPath,
} from '../shared/utils/navigation.utils';
import { resolveOptions } from '../shared/utils/options.utils';
import { findFormPage } from '../shared/utils/schema.utils';
import { readBlob } from '../shared/utils/storage.utils';
import { renderField } from './componentRegistry';
import { submitFormAction } from './formActions';

export type FormRendererProps = {
  applicationId: string;
  journeyId: string;
  schema: FormPage;
  /** Pre-fill values keyed by field id. */
  values?: FormAnswers;
  /** Inline errors keyed by field id; also drives the ErrorSummary. */
  errors?: Record<string, string>;
  /** Server-resolved options for select fields with a dataSource. */
  dataSources?: Record<string, FieldOption[]>;
  /** Submit button label override (wins over `schema.submitLabel`). */
  submitLabel?: string;
  /**
   * Looping-journey instance id. When set, the submit action persists into
   * `entries[instanceId].answers[formId]`, the back link preserves the
   * instance, and secondary links carry it through too.
   */
  instanceId?: string;
};

export function FormRenderer(props: FormRendererProps): ReactElement {
  const {
    applicationId,
    journeyId,
    schema,
    values = {},
    errors = {},
    dataSources,
    instanceId,
  } = props;
  const submitLabel = props.submitLabel ?? schema.submitLabel ?? 'Save and continue';
  const { components: c, tokens: t } = getDesignSystem();

  const errorItems: ErrorSummaryItem[] = Object.entries(errors).map(([fieldId, message]) => ({
    fieldId,
    message,
  }));

  const action = submitFormAction.bind(
    null,
    applicationId,
    journeyId,
    schema.formId,
    instanceId ?? null,
  );
  const withInstance = (path: string): string =>
    instanceId ? `${path}${path.includes('?') ? '&' : '?'}instance=${encodeURIComponent(instanceId)}` : path;
  const backHref = schema.back
    ? withInstance(resolveBackPath(applicationId, journeyId, schema.back))
    : null;

  return (
    <>
      {backHref ? <c.BackLink href={backHref}>Back</c.BackLink> : null}
      {errorItems.length > 0 ? <c.ErrorSummary errors={errorItems} /> : null}
      {schema.caption ? (
        <span className={t.captionL}>{schema.caption}</span>
      ) : null}
      <h1 className={t.headingL}>{schema.title}</h1>
      {schema.description ? (
        <p className={t.body} style={{ whiteSpace: 'pre-line' }}>
          {schema.description}
        </p>
      ) : null}
      <form action={action} noValidate>
        {schema.fields.map((field) => (
          <div key={field.id}>{renderField(field, { values, errors, dataSources })}</div>
        ))}
        <c.Button type="submit">{submitLabel}</c.Button>
      </form>
      {schema.secondaryLinks && schema.secondaryLinks.length > 0 ? (
        <p className={t.body}>
          {schema.secondaryLinks.map((link, idx) => (
            <span key={idx}>
              {idx > 0 ? ' · ' : null}
              <a
                className={t.link}
                href={resolveNextPath(applicationId, journeyId, link.href)}
              >
                {link.text}
              </a>
            </span>
          ))}
        </p>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page state loader — pair with FormRenderer in the consumer's page.tsx.
// ---------------------------------------------------------------------------

export type FormPageState = {
  schema: FormPage;
  values: FormAnswers;
  errors: Record<string, string>;
  dataSources: Record<string, FieldOption[]>;
};

export type FormPageStateWithInstance = FormPageState & { instanceId?: string };

/**
 * Load everything FormRenderer needs in one call:
 *   - Form schema from blob (throws if formId is unknown).
 *   - Honour `schema.redirectIfMissing` — redirect on the server when a
 *     prerequisite path resolves empty (this never returns).
 *   - Resolve dynamic options for any select with a `dataSource`.
 *   - For looping journeys (`FormSchema.looping`), read pre-fill values from
 *     `entries[instanceId].answers[formId]`. The `instanceId` arrives via
 *     the page's `?instance=` query string (read in the page component).
 *   - If a draft from a prior failed submit exists, use its values + errors
 *     (consumeDraft is one-shot — read-and-delete).
 *   - Otherwise, pull pre-fill values from the saved per-journey answers.
 */
export async function loadFormPageState(
  applicationId: string,
  journeyId: string,
  formId: string,
  instanceId?: string,
): Promise<FormPageStateWithInstance> {
  const schemaBlob = await readBlob<FormSchema>(
    BLOB_PATHS.journeyFormSchemas(applicationId, journeyId),
  );
  const schema = findFormPage(schemaBlob.data, formId);
  if (!schema) {
    throw new Error(`Unknown formId: ${formId} on journey ${journeyId}`);
  }

  if (schemaBlob.data.looping && !instanceId) {
    throw new Error(
      `Looping journey '${journeyId}' requires an ?instance= query param.`,
    );
  }

  const { state: parent } = await loadOrInitParent(applicationId);

  if (schema.redirectIfMissing) {
    const v = resolveValueFromPath(parent, journeyId, schema.redirectIfMissing.valueFrom);
    if (v === undefined || v === null || v === '') {
      redirect(resolveNextPath(applicationId, journeyId, schema.redirectIfMissing.to));
    }
  }

  const dataSources: Record<string, FieldOption[]> = {};
  for (const field of schema.fields) {
    if (field.type === 'select' && field.dataSource) {
      const raw = resolveValueFromPath(parent, journeyId, field.dataSource.paramFrom);
      const param = typeof raw === 'string' ? raw : '';
      dataSources[field.id] = await resolveOptions(field.dataSource.providerId, param);
    }
  }

  const draft = await consumeDraft(applicationId, journeyId, formId);
  if (draft) {
    return {
      schema,
      values: draft.values,
      errors: draft.errors,
      dataSources,
      ...(instanceId ? { instanceId } : {}),
    };
  }

  let values: FormAnswers = {};
  if (instanceId) {
    const entry = findEntry(parent.journeys[journeyId], instanceId);
    values = entry?.answers[formId] ?? {};
  } else {
    const journeyBlob = await loadJourney(applicationId, journeyId);
    values = journeyBlob?.data.answers[formId] ?? {};
  }
  return {
    schema,
    values,
    errors: {},
    dataSources,
    ...(instanceId ? { instanceId } : {}),
  };
}
