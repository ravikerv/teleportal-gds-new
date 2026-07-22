/**
 * Referential validation of a generated bundle — the machine-checkable
 * subset of the Journey Builder's own validation, run server-side so the
 * model can self-repair before a human ever sees the result. The builder
 * remains the final authority when the BA reviews the import.
 */

import type { GeneratedBundle, ValidationIssue } from './types.js';

type AnyRecord = Record<string, unknown>;

const RESERVED_TOKENS = new Set([
  'summary',
  'task-list',
  'journey-root',
  'parent-summary',
]);

export function validateBundle(bundle: GeneratedBundle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const journeys = new Map<
    string,
    { forms: AnyRecord[]; looping?: AnyRecord; summary?: AnyRecord }
  >();
  let taskList: AnyRecord | null = null;

  // Parse every file first.
  for (const file of bundle.files) {
    let data: unknown;
    try {
      data = JSON.parse(file.json);
    } catch {
      issues.push({ severity: 'error', message: `${file.path}: invalid JSON` });
      continue;
    }
    if (typeof data !== 'object' || data === null) {
      issues.push({ severity: 'error', message: `${file.path}: not an object` });
      continue;
    }
    const obj = data as AnyRecord;
    const name = file.path.split('/').pop() ?? '';
    if (name === 'task-list-schema.json') {
      taskList = obj;
    } else if (name === 'form-schemas.json') {
      const jid = obj.journeyId;
      if (typeof jid !== 'string') {
        issues.push({ severity: 'error', message: `${file.path}: missing journeyId` });
        continue;
      }
      const entry = journeys.get(jid) ?? { forms: [] };
      entry.forms = Array.isArray(obj.forms) ? (obj.forms as AnyRecord[]) : [];
      if (obj.looping && typeof obj.looping === 'object') {
        entry.looping = obj.looping as AnyRecord;
      }
      journeys.set(jid, entry);
    } else if (name === 'summary-schema.json') {
      const jid = obj.journeyId;
      if (typeof jid !== 'string') {
        issues.push({ severity: 'error', message: `${file.path}: missing journeyId` });
        continue;
      }
      const entry = journeys.get(jid) ?? { forms: [] };
      entry.summary = obj;
      journeys.set(jid, entry);
    }
  }

  if (!taskList) {
    issues.push({ severity: 'warning', message: 'bundle has no task-list-schema.json' });
  }

  const isForm = (p: AnyRecord): boolean => p.type === undefined || p.type === 'form';

  const resolvesToken = (token: unknown, jid: string): boolean => {
    if (typeof token !== 'string' || token === '') return false;
    if (RESERVED_TOKENS.has(token)) return true;
    if (token.startsWith('journey:')) {
      return journeys.has(token.slice('journey:'.length));
    }
    if (token.startsWith('add-instance:')) {
      return journeys.has(token.slice('add-instance:'.length));
    }
    const journey = journeys.get(jid);
    return !!journey?.forms.some((p) => isForm(p) && p.formId === token);
  };

  // Per-journey checks.
  for (const [jid, journey] of journeys) {
    const formIds = new Set<string>();
    for (const page of journey.forms) {
      if (!isForm(page)) continue;
      const formId = String(page.formId ?? '');
      if (formIds.has(formId)) {
        issues.push({ severity: 'error', message: `${jid}: duplicate formId '${formId}'` });
      }
      formIds.add(formId);
    }

    for (const page of journey.forms) {
      const pageId = String(page.formId ?? page.id ?? '?');
      const nav: [string, unknown][] = [['next', page.next]];
      if (page.back !== undefined) nav.push(['back', page.back]);
      for (const [kind, token] of nav) {
        if (token === undefined) continue;
        if (!resolvesToken(token, jid)) {
          issues.push({
            severity: 'error',
            message: `${jid}/${pageId}: ${kind} token '${String(token)}' does not resolve`,
          });
        }
      }
      if (Array.isArray(page.nextWhen) && isForm(page)) {
        const fields = Array.isArray(page.fields) ? (page.fields as AnyRecord[]) : [];
        for (const rule of page.nextWhen as AnyRecord[]) {
          const field = fields.find((f) => f.id === rule.fieldId);
          if (!field) {
            issues.push({
              severity: 'error',
              message: `${jid}/${pageId}: nextWhen fieldId '${String(rule.fieldId)}' is not a field on this form`,
            });
          } else if (Array.isArray(field.options)) {
            const values = (field.options as AnyRecord[]).map((o) => o.value);
            if (!values.includes(rule.value)) {
              issues.push({
                severity: 'error',
                message: `${jid}/${pageId}: nextWhen value '${String(rule.value)}' is not an option of '${String(rule.fieldId)}'`,
              });
            }
          }
          if (!resolvesToken(rule.then, jid)) {
            issues.push({
              severity: 'error',
              message: `${jid}/${pageId}: nextWhen then '${String(rule.then)}' does not resolve`,
            });
          }
        }
      }
    }

    // Summary checks.
    const summary = journey.summary;
    if (summary) {
      if (!resolvesToken(summary.next, jid)) {
        issues.push({
          severity: 'error',
          message: `${jid}/summary: next token '${String(summary.next)}' does not resolve`,
        });
      }
      const rows = Array.isArray(summary.headerRows)
        ? (summary.headerRows as AnyRecord[])
        : [];
      for (const row of rows) {
        const path = String(row.valueFrom ?? '');
        const [formId, fieldId] = path.split('.');
        const form = journey.forms.find((p) => isForm(p) && p.formId === formId);
        const fields = Array.isArray(form?.fields) ? (form.fields as AnyRecord[]) : [];
        if (!form || !fields.some((f) => f.id === fieldId)) {
          issues.push({
            severity: 'error',
            message: `${jid}/summary: valueFrom '${path}' does not exist`,
          });
        }
      }
      const entries = summary.entries as AnyRecord | undefined;
      if (entries) {
        const childId = String(entries.fromJourneyId ?? '');
        const child = journeys.get(childId);
        if (!child) {
          issues.push({
            severity: 'error',
            message: `${jid}/summary: entries.fromJourneyId '${childId}' is not an emitted journey`,
          });
        } else if (child.looping?.parentJourneyId !== jid) {
          issues.push({
            severity: 'error',
            message: `${jid}/summary: '${childId}' must set looping.parentJourneyId = '${jid}'`,
          });
        }
      }
    }
  }

  // Master task list references.
  if (taskList) {
    const tasks: AnyRecord[] = [];
    if (Array.isArray(taskList.tasks)) tasks.push(...(taskList.tasks as AnyRecord[]));
    if (Array.isArray(taskList.sections)) {
      for (const section of taskList.sections as AnyRecord[]) {
        if (Array.isArray(section.tasks)) tasks.push(...(section.tasks as AnyRecord[]));
      }
    }
    for (const task of tasks) {
      const ref = String(
        (task.type === 'nested-journey' ? task.journeyRef : task.id) ?? '',
      );
      if (!journeys.has(ref)) {
        issues.push({
          severity: 'warning',
          message: `task list references journey '${ref}' which is not in the bundle`,
        });
      }
    }
  }

  return issues;
}
