/**
 * Project-level cross-reference validation.
 *
 * The TypeScript types already constrain shape; what they can't constrain
 * is *referential* correctness — a `next` token pointing to a non-existent
 * form, a `valueFrom` referencing a field that no form has, a looping
 * journey whose parent has no entries-block summary, etc. Those checks
 * live here.
 *
 * Each check returns `Issue[]`; the panel groups them by severity and
 * journey for the user.
 */

import type {
  FormPage,
  FormSchema,
  HubPage,
  JourneyPage,
  SummarySchema,
  TaskListJourneyPage,
  TaskListSchema,
} from '../schema';
import type { Project } from '../store';

export type IssueSeverity = 'error' | 'warning';

/**
 * Mechanical one-click corrections offered next to certain issues. The
 * panel maps these to store actions; the validation engine itself stays
 * pure (no store coupling).
 */
export type QuickFix =
  | { kind: 'set-form-next'; journeyId: string; formId: string; value: string; label: string }
  | { kind: 'clear-form-next'; journeyId: string; formId: string; label: string }
  | { kind: 'remove-next-when'; journeyId: string; formId: string; fieldId: string; value: string; label: string };

export type Issue = {
  severity: IssueSeverity;
  message: string;
  /** Journey id (or null for master-level issues). */
  journeyId: string | null;
  /** Optional node id to select when the user clicks the issue. */
  nodeId?: string;
  /** Mechanical correction that the panel can apply for the user. */
  quickFix?: QuickFix;
};

export function validateProject(project: Project): Issue[] {
  const issues: Issue[] = [];
  const knownJourneys = new Set(Object.keys(project.journeys));

  // Master task list cross-refs.
  issues.push(...checkTaskListRefs(project.taskList, null, knownJourneys));

  for (const [jid, journey] of Object.entries(project.journeys)) {
    issues.push(...checkJourney(jid, journey.formSchema, journey.summarySchema, knownJourneys, project));
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Per-journey checks
// ---------------------------------------------------------------------------

function checkJourney(
  jid: string,
  formSchema: FormSchema,
  summarySchema: SummarySchema | undefined,
  knownJourneys: Set<string>,
  project: Project,
): Issue[] {
  const issues: Issue[] = [];

  // Local form ids for next-token resolution within this journey.
  const localFormIds = new Set<string>();
  for (const p of formSchema.forms) {
    if (isFormPage(p)) localFormIds.add(p.formId);
  }

  // Field-id collisions per form, and gather available paths for valueFrom.
  // Available paths = `${formId}.${fieldId}` for every (form, field).
  const availablePaths = new Set<string>();
  for (const p of formSchema.forms) {
    if (!isFormPage(p)) continue;
    const seenFieldIds = new Set<string>();
    for (const f of p.fields) {
      if (seenFieldIds.has(f.id)) {
        issues.push({
          severity: 'error',
          message: `Form '${p.formId}' has duplicate field id '${f.id}'`,
          journeyId: jid,
          nodeId: p.formId,
        });
      } else {
        seenFieldIds.add(f.id);
      }
      availablePaths.add(`${p.formId}.${f.id}`);
      // Select fields with dataSource emit a `${id}_label` companion at runtime.
      if (f.type === 'select' && (f as { dataSource?: unknown }).dataSource) {
        availablePaths.add(`${p.formId}.${f.id}_label`);
      }
    }
  }

  // Per-page checks
  for (const p of formSchema.forms) {
    if (isFormPage(p)) issues.push(...checkFormPage(jid, p, localFormIds, knownJourneys));
    if (p.type === 'hub') issues.push(...checkHubPage(jid, p, localFormIds, knownJourneys, availablePaths));
    if (p.type === 'task-list')
      issues.push(...checkTaskListRefs(p, jid, knownJourneys));
  }

  // Summary
  if (summarySchema) {
    issues.push(
      ...checkSummary(jid, summarySchema, localFormIds, knownJourneys, project, availablePaths),
    );
  }

  // Looping config
  if (formSchema.looping) {
    const parent = formSchema.looping.parentJourneyId;
    if (!knownJourneys.has(parent)) {
      issues.push({
        severity: 'error',
        message: `Looping journey '${jid}' references unknown parent '${parent}'`,
        journeyId: jid,
      });
    } else {
      const parentJourney = project.journeys[parent]!;
      const summary = parentJourney.summarySchema;
      if (!summary) {
        issues.push({
          severity: 'error',
          message: `Parent journey '${parent}' has no summary-schema.json — looping journey '${jid}' has no place to return to`,
          journeyId: jid,
        });
      } else if (!summary.entries) {
        issues.push({
          severity: 'warning',
          message: `Parent summary in '${parent}' has no entries block — entries from '${jid}' won't be listed there`,
          journeyId: parent,
        });
      } else if (summary.entries.fromJourneyId !== jid) {
        issues.push({
          severity: 'warning',
          message: `Parent summary entries.fromJourneyId is '${summary.entries.fromJourneyId}', not the looping journey '${jid}'`,
          journeyId: parent,
        });
      }
    }
  }

  return issues;
}

function checkFormPage(
  jid: string,
  page: FormPage,
  localFormIds: Set<string>,
  knownJourneys: Set<string>,
): Issue[] {
  const issues: Issue[] = [];
  if (!page.next || page.next === '') {
    issues.push({
      severity: 'error',
      message: `Form '${page.formId}' has empty 'next' — wire an outgoing edge or set the token in the inspector`,
      journeyId: jid,
      nodeId: page.formId,
      quickFix: {
        kind: 'set-form-next',
        journeyId: jid,
        formId: page.formId,
        value: 'task-list',
        label: "Set to 'task-list'",
      },
    });
  } else {
    issues.push(
      ...checkNavToken(page.next, jid, page.formId, localFormIds, knownJourneys, 'next', {
        kind: 'form-next',
        formId: page.formId,
      }),
    );
  }
  if (page.back) {
    issues.push(...checkNavToken(page.back, jid, page.formId, localFormIds, knownJourneys, 'back'));
  }
  for (const rule of page.nextWhen ?? []) {
    if (!rule.fieldId) {
      issues.push({
        severity: 'error',
        message: `Form '${page.formId}' has a nextWhen rule with empty fieldId`,
        journeyId: jid,
        nodeId: page.formId,
      });
    } else if (!page.fields.some((f) => f.id === rule.fieldId)) {
      issues.push({
        severity: 'error',
        message: `Form '${page.formId}' nextWhen references field '${rule.fieldId}' which doesn't exist on this form`,
        journeyId: jid,
        nodeId: page.formId,
      });
    }
    if (!rule.then) {
      issues.push({
        severity: 'error',
        message: `Form '${page.formId}' nextWhen rule (${rule.fieldId}=${rule.value}) has empty 'then'`,
        journeyId: jid,
        nodeId: page.formId,
      });
    } else {
      issues.push(
        ...checkNavToken(rule.then, jid, page.formId, localFormIds, knownJourneys, `nextWhen[${rule.fieldId}]`, {
          kind: 'form-next-when',
          formId: page.formId,
          fieldId: rule.fieldId,
          value: rule.value,
        }),
      );
    }
  }
  return issues;
}

function checkHubPage(
  jid: string,
  page: HubPage,
  localFormIds: Set<string>,
  knownJourneys: Set<string>,
  availablePaths: Set<string>,
): Issue[] {
  const issues: Issue[] = [];
  for (const item of page.items) {
    if (item.link) {
      issues.push(
        ...checkNavToken(item.link, jid, page.id, localFormIds, knownJourneys, `item[${item.id}].link`),
      );
    }
    if (item.showWhen && !pathLooksValid(item.showWhen, availablePaths)) {
      issues.push({
        severity: 'warning',
        message: `Hub item '${item.id}' showWhen path '${item.showWhen}' doesn't match any field on this journey`,
        journeyId: jid,
        nodeId: `__hub:${page.id}`,
      });
    }
    for (const src of item.sources) {
      if (src.valueFrom && !pathLooksValid(src.valueFrom, availablePaths)) {
        issues.push({
          severity: 'warning',
          message: `Hub item '${item.id}' source path '${src.valueFrom}' doesn't match any field on this journey`,
          journeyId: jid,
          nodeId: `__hub:${page.id}`,
        });
      }
      for (const p of src.displayPaths ?? []) {
        if (!pathLooksValid(p, availablePaths)) {
          issues.push({
            severity: 'warning',
            message: `Hub item '${item.id}' displayPath '${p}' doesn't match any field on this journey`,
            journeyId: jid,
            nodeId: `__hub:${page.id}`,
          });
        }
      }
    }
  }
  if (page.next) {
    issues.push(...checkNavToken(page.next, jid, page.id, localFormIds, knownJourneys, `hub[${page.id}].next`));
  }
  return issues;
}

function checkSummary(
  jid: string,
  summary: SummarySchema,
  localFormIds: Set<string>,
  knownJourneys: Set<string>,
  project: Project,
  availablePaths: Set<string>,
): Issue[] {
  const issues: Issue[] = [];
  if (summary.next) {
    issues.push(
      ...checkNavToken(summary.next, jid, 'summary', localFormIds, knownJourneys, 'summary.next'),
    );
  }
  for (const r of summary.headerRows ?? []) {
    if (r.valueFrom && !pathLooksValid(r.valueFrom, availablePaths)) {
      issues.push({
        severity: 'warning',
        message: `Summary headerRow '${r.key}' valueFrom '${r.valueFrom}' doesn't match any field on this journey`,
        journeyId: jid,
        nodeId: '__summary',
      });
    }
    if (r.changeLink && !localFormIds.has(r.changeLink)) {
      issues.push({
        severity: 'warning',
        message: `Summary headerRow '${r.key}' changeLink '${r.changeLink}' is not a form id in this journey`,
        journeyId: jid,
        nodeId: '__summary',
      });
    }
  }
  if (summary.entries) {
    const child = project.journeys[summary.entries.fromJourneyId];
    if (!child) {
      issues.push({
        severity: 'error',
        message: `Summary entries.fromJourneyId '${summary.entries.fromJourneyId}' is not a known journey`,
        journeyId: jid,
        nodeId: '__summary',
      });
    } else if (!child.formSchema.looping) {
      issues.push({
        severity: 'error',
        message: `Summary entries.fromJourneyId '${summary.entries.fromJourneyId}' must be a looping journey (FormSchema.looping)`,
        journeyId: jid,
        nodeId: '__summary',
      });
    } else if (child.formSchema.looping.parentJourneyId !== jid) {
      issues.push({
        severity: 'warning',
        message: `Looping child '${summary.entries.fromJourneyId}'.parentJourneyId is '${child.formSchema.looping.parentJourneyId}', not '${jid}'`,
        journeyId: jid,
        nodeId: '__summary',
      });
    }
    // Per-entry rows reference fields inside the looping child.
    if (child) {
      const childPaths = collectFieldPaths(child.formSchema);
      for (const row of summary.entries.rows) {
        if (row.valueFrom && !pathLooksValid(row.valueFrom, childPaths)) {
          issues.push({
            severity: 'warning',
            message: `Entries row '${row.key}' valueFrom '${row.valueFrom}' doesn't match any field in '${summary.entries.fromJourneyId}'`,
            journeyId: jid,
            nodeId: '__summary',
          });
        }
        for (const p of row.valueFromAll ?? []) {
          if (!pathLooksValid(p, childPaths)) {
            issues.push({
              severity: 'warning',
              message: `Entries row '${row.key}' valueFromAll '${p}' doesn't match any field in '${summary.entries.fromJourneyId}'`,
              journeyId: jid,
              nodeId: '__summary',
            });
          }
        }
        if (row.changeFormId && !child.formSchema.forms.some((p) => isFormPage(p) && (p as FormPage).formId === row.changeFormId)) {
          issues.push({
            severity: 'warning',
            message: `Entries row '${row.key}' changeFormId '${row.changeFormId}' is not a form in '${summary.entries.fromJourneyId}'`,
            journeyId: jid,
            nodeId: '__summary',
          });
        }
      }
    }
  }
  return issues;
}

function checkTaskListRefs(
  source: TaskListSchema | TaskListJourneyPage,
  jid: string | null,
  knownJourneys: Set<string>,
): Issue[] {
  const issues: Issue[] = [];
  const tasks = source.sections
    ? source.sections.flatMap((s) => s.tasks)
    : (source.tasks ?? []);
  for (const t of tasks) {
    const journeyRef = t.type === 'nested-journey' ? t.journeyRef : t.id;
    if (!knownJourneys.has(journeyRef)) {
      issues.push({
        severity: 'warning',
        message: `Task '${t.id}' references journey '${journeyRef}' which doesn't exist in the project`,
        journeyId: jid,
      });
    }
    for (const dep of t.dependsOn ?? []) {
      if (!tasks.some((tt) => tt.id === dep)) {
        issues.push({
          severity: 'warning',
          message: `Task '${t.id}' dependsOn '${dep}' which isn't a sibling task in this list`,
          journeyId: jid,
        });
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isFormPage(page: JourneyPage): page is FormPage {
  return page.type === undefined || page.type === 'form';
}

type NavFixContext =
  | { kind: 'form-next'; formId: string }
  | { kind: 'form-next-when'; formId: string; fieldId: string; value: string };

function checkNavToken(
  token: string,
  jid: string,
  fromId: string,
  localFormIds: Set<string>,
  knownJourneys: Set<string>,
  context: string,
  fixContext?: NavFixContext,
): Issue[] {
  // Builtins always resolve.
  if (
    token === 'summary' ||
    token === 'task-list' ||
    token === 'journey-root' ||
    token === 'parent-summary' ||
    token === 'confirmation'
  ) {
    return [];
  }
  if (token.startsWith('journey:')) {
    const target = token.slice('journey:'.length);
    if (!knownJourneys.has(target)) {
      return [
        {
          severity: 'error',
          message: `${fromId}: ${context} → 'journey:${target}' references unknown journey`,
          journeyId: jid,
          nodeId: fromId,
          ...(fixContext ? { quickFix: navQuickFix(jid, fixContext) } : {}),
        },
      ];
    }
    return [];
  }
  if (token.startsWith('add-instance:')) {
    const target = token.slice('add-instance:'.length);
    if (!knownJourneys.has(target)) {
      return [
        {
          severity: 'error',
          message: `${fromId}: ${context} → 'add-instance:${target}' references unknown journey`,
          journeyId: jid,
          nodeId: fromId,
          ...(fixContext ? { quickFix: navQuickFix(jid, fixContext) } : {}),
        },
      ];
    }
    return [];
  }
  // Otherwise it's a same-journey form id.
  if (!localFormIds.has(token)) {
    return [
      {
        severity: 'error',
        message: `${fromId}: ${context} → '${token}' is not a form id in this journey`,
        journeyId: jid,
        nodeId: fromId,
        ...(fixContext ? { quickFix: navQuickFix(jid, fixContext) } : {}),
      },
    ];
  }
  return [];
}

function navQuickFix(jid: string, ctx: NavFixContext): QuickFix {
  if (ctx.kind === 'form-next') {
    return {
      kind: 'clear-form-next',
      journeyId: jid,
      formId: ctx.formId,
      label: "Clear 'next'",
    };
  }
  return {
    kind: 'remove-next-when',
    journeyId: jid,
    formId: ctx.formId,
    fieldId: ctx.fieldId,
    value: ctx.value,
    label: 'Remove rule',
  };
}

function collectFieldPaths(schema: FormSchema): Set<string> {
  const out = new Set<string>();
  for (const p of schema.forms) {
    if (!isFormPage(p)) continue;
    for (const f of p.fields) {
      out.add(`${p.formId}.${f.id}`);
      if (f.type === 'select' && (f as { dataSource?: unknown }).dataSource) {
        out.add(`${p.formId}.${f.id}_label`);
      }
    }
  }
  return out;
}

function pathLooksValid(path: string, available: Set<string>): boolean {
  // Accept any prefix match — paths may dive into a nested object.
  if (available.has(path)) return true;
  for (const a of available) {
    if (path.startsWith(`${a}.`)) return true;
  }
  return false;
}
