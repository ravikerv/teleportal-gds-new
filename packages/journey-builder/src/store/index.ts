/**
 * Zustand store — owns the project (master task list + journeys, each with
 * a FormSchema + optional SummarySchema + a layout side-car) plus the UI
 * selection state (active journey, selected node).
 *
 * The schema is the source of truth. All schema-affecting edits go through
 * actions here; layout-only changes (drag) live in the side-car.
 *
 * Re-derivation is on-read: components memoize `schemaToCanvas` calls
 * against the journey ref so derivation only runs on actual mutation.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { PATTERNS_BY_ID, type Pattern } from '../patterns';

import {
  EXTERNAL_NODE_PREFIX,
  HUB_NODE_PREFIX,
  SUMMARY_NODE_ID,
  TASKLIST_NODE_PREFIX,
  canvasToSchema,
  formOrderOf,
  schemaToCanvas,
  type FormPage,
  type FormSchema,
  type HubPage,
  type JourneyPage,
  type LayoutMap,
  type NextWhenRule,
  type SummarySchema,
  type TaskListJourneyPage,
  type TaskListSchema,
} from '../schema';

// ---------------------------------------------------------------------------
// Project shape
// ---------------------------------------------------------------------------

export type ProjectJourney = {
  formSchema: FormSchema;
  summarySchema?: SummarySchema;
  /** Source-order list of formIds — preserved across edits for export. */
  formOrder: string[];
  /** Per-node positions (drag state). Side-car; not in schema. */
  layout: LayoutMap;
};

export type Project = {
  applicationId: string;
  taskList: TaskListSchema;
  journeys: Record<string, ProjectJourney>;
};

export type AddPageKind = 'form' | 'hub' | 'task-list' | 'summary';

/** Sentinel for "show the master task list" instead of a journey canvas. */
export const MASTER_VIEW_ID = '__master__';

// ---------------------------------------------------------------------------
// Store state + actions
// ---------------------------------------------------------------------------

type BuilderState = {
  project: Project;
  activeJourneyId: string;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Selection / project
  loadProject: (next: Project) => void;
  setActiveJourney: (journeyId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  /** Replace the master TaskListSchema (title, sections, footer actions). */
  updateMasterTaskList: (patch: Partial<TaskListSchema>) => void;

  // Layout (schema-untouched)
  setNodePosition: (
    journeyId: string,
    nodeId: string,
    pos: { x: number; y: number },
  ) => void;

  // Page CRUD
  addPage: (
    journeyId: string,
    kind: AddPageKind,
    position: { x: number; y: number },
  ) => string; // returns the new node id
  removePageByNodeId: (journeyId: string, nodeId: string) => void;

  /**
   * Drop a pattern (pre-built sub-graph) onto the current journey.
   * Adds pages, optionally a summary, and any new sibling journeys
   * referenced by the pattern (e.g. the looping-collection pattern
   * mints its own child looping journey).
   */
  applyPattern: (
    journeyId: string,
    patternId: string,
    position: { x: number; y: number },
  ) => string | undefined;

  // Page property edits
  updateFormPage: (
    journeyId: string,
    formId: string,
    patch: Partial<FormPage>,
  ) => void;
  updateHubPage: (
    journeyId: string,
    hubId: string,
    patch: Partial<HubPage>,
  ) => void;
  updateTaskListPage: (
    journeyId: string,
    tlId: string,
    patch: Partial<TaskListJourneyPage>,
  ) => void;
  updateSummary: (journeyId: string, patch: Partial<SummarySchema>) => void;

  // Field CRUD on a FormPage
  addField: (journeyId: string, formId: string) => string; // returns new field id
  removeField: (journeyId: string, formId: string, fieldId: string) => void;
  updateField: (
    journeyId: string,
    formId: string,
    fieldId: string,
    patch: Record<string, unknown>,
  ) => void;

  // Edge ops (schema-side)
  /** Replace a form's default `next` with the token derived from the target node id. */
  setFormNext: (
    journeyId: string,
    sourceNodeId: string,
    targetNodeId: string,
  ) => void;
  setSummaryNext: (journeyId: string, targetNodeId: string) => void;
  addNextWhen: (
    journeyId: string,
    formId: string,
    rule: NextWhenRule,
  ) => void;
  removeNextWhen: (
    journeyId: string,
    formId: string,
    fieldId: string,
    value: string,
  ) => void;
};

export const STORAGE_KEY = 'teleportal-builder-project-v1';

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
  project: emptyProject(),
  activeJourneyId: '',
  selectedNodeId: null,
  selectedEdgeId: null,

  loadProject: (next) =>
    set({
      project: next,
      // Default to the master task list view so the project is visible
      // immediately. Clicking a journey in the tree switches.
      activeJourneyId: MASTER_VIEW_ID,
      selectedNodeId: null,
      selectedEdgeId: null,
    }),

  setActiveJourney: (journeyId) =>
    set({ activeJourneyId: journeyId, selectedNodeId: null, selectedEdgeId: null }),

  setSelectedNode: (nodeId) =>
    set({ selectedNodeId: nodeId, selectedEdgeId: null }),

  setSelectedEdge: (edgeId) =>
    set({ selectedEdgeId: edgeId, selectedNodeId: null }),

  updateMasterTaskList: (patch) =>
    set((state) => ({
      project: { ...state.project, taskList: { ...state.project.taskList, ...patch } },
    })),

  setNodePosition: (journeyId, nodeId, pos) =>
    setJourney(set, journeyId, (j) => ({ ...j, layout: { ...j.layout, [nodeId]: pos } })),

  addPage: (journeyId, kind, position) => {
    const journey = get().project.journeys[journeyId];
    if (!journey) return '';
    const { newPage, nodeId } = mintPage(kind, journey);
    setJourney(set, journeyId, (j) => {
      // Summary lives in summarySchema, not in forms[].
      if (kind === 'summary' && newPage.kind === 'summary') {
        return {
          ...j,
          summarySchema: newPage.page,
          layout: { ...j.layout, [nodeId]: position },
        };
      }
      const insertIdx = j.formSchema.forms.length;
      const nextForms = [...j.formSchema.forms];
      nextForms.splice(insertIdx, 0, newPage.page as JourneyPage);
      return {
        ...j,
        formSchema: { ...j.formSchema, forms: nextForms },
        formOrder: kind === 'form'
          ? [...j.formOrder, (newPage.page as FormPage).formId]
          : j.formOrder,
        layout: { ...j.layout, [nodeId]: position },
      };
    });
    return nodeId;
  },

  removePageByNodeId: (journeyId, nodeId) =>
    setJourney(set, journeyId, (j) => removePageById(j, nodeId)),

  applyPattern: (journeyId, patternId, position) => {
    const pattern: Pattern | undefined = PATTERNS_BY_ID[patternId];
    if (!pattern) return undefined;
    const project = get().project;
    const journey = project.journeys[journeyId];
    if (!journey) return undefined;

    const existingIds = collectIds(project, journey);
    const result = pattern.apply(journeyId, position, existingIds);

    set((state) => {
      const j = state.project.journeys[journeyId];
      if (!j) return state;

      // 1. Add pages to current journey + record positions in layout.
      let nextForms = [...j.formSchema.forms];
      let nextLayout = { ...j.layout };
      let nextOrder = [...j.formOrder];
      for (const spec of result.pages ?? []) {
        nextForms.push(spec.page);
        if (isFormPage(spec.page)) {
          nextOrder.push((spec.page as FormPage).formId);
          nextLayout[(spec.page as FormPage).formId] = spec.position;
        } else if (spec.page.type === 'hub') {
          nextLayout[`__hub:${spec.page.id}`] = spec.position;
        } else if (spec.page.type === 'task-list') {
          nextLayout[`__tasklist:${spec.page.id}`] = spec.position;
        }
      }

      // 2. Optional summary on the current journey (replaces any existing).
      let nextSummary = j.summarySchema;
      if (result.summarySchema) {
        nextSummary = result.summarySchema;
        if (result.summaryPosition) {
          nextLayout[SUMMARY_NODE_ID] = result.summaryPosition;
        }
      }

      const updatedJourney: ProjectJourney = {
        ...j,
        formSchema: { ...j.formSchema, forms: nextForms },
        formOrder: nextOrder,
        layout: nextLayout,
        ...(nextSummary ? { summarySchema: nextSummary } : {}),
      };

      // 3. Add any sibling looping journeys minted by the pattern.
      const updatedJourneys: Record<string, ProjectJourney> = {
        ...state.project.journeys,
        [journeyId]: updatedJourney,
      };
      for (const nj of result.newJourneys ?? []) {
        updatedJourneys[nj.journeyId] = buildProjectJourney(
          nj.formSchema,
          nj.summarySchema,
          nj.layout ?? {},
        );
      }

      return {
        project: { ...state.project, journeys: updatedJourneys },
        selectedNodeId: result.selectAfter ?? null,
        selectedEdgeId: null,
      };
    });

    return result.selectAfter;
  },

  updateFormPage: (journeyId, formId, patch) =>
    setJourney(set, journeyId, (j) => ({
      ...j,
      formSchema: {
        ...j.formSchema,
        forms: j.formSchema.forms.map((p) =>
          isFormPage(p) && p.formId === formId ? mergeFormPage(p, patch) : p,
        ),
      },
      // Keep formOrder in sync if formId itself was renamed.
      formOrder:
        typeof patch.formId === 'string' && patch.formId !== formId
          ? j.formOrder.map((id) => (id === formId ? (patch.formId as string) : id))
          : j.formOrder,
    })),

  updateHubPage: (journeyId, hubId, patch) =>
    setJourney(set, journeyId, (j) => ({
      ...j,
      formSchema: {
        ...j.formSchema,
        forms: j.formSchema.forms.map((p) =>
          p.type === 'hub' && p.id === hubId ? { ...p, ...patch } : p,
        ),
      },
    })),

  updateTaskListPage: (journeyId, tlId, patch) =>
    setJourney(set, journeyId, (j) => ({
      ...j,
      formSchema: {
        ...j.formSchema,
        forms: j.formSchema.forms.map((p) =>
          p.type === 'task-list' && p.id === tlId ? { ...p, ...patch } : p,
        ),
      },
    })),

  updateSummary: (journeyId, patch) =>
    setJourney(set, journeyId, (j) =>
      j.summarySchema ? { ...j, summarySchema: { ...j.summarySchema, ...patch } } : j,
    ),

  addField: (journeyId, formId) => {
    const journey = get().project.journeys[journeyId];
    const page = journey?.formSchema.forms.find(
      (p): p is FormPage => isFormPage(p) && p.formId === formId,
    );
    if (!page) return '';
    const id = uniqueFieldId(page.fields.map((f) => f.id), 'field');
    const field = {
      id,
      type: 'input' as const,
      label: 'New field',
      validation: { required: false },
    };
    setJourney(set, journeyId, (j) => ({
      ...j,
      formSchema: {
        ...j.formSchema,
        forms: j.formSchema.forms.map((p) =>
          isFormPage(p) && p.formId === formId
            ? { ...p, fields: [...p.fields, field] }
            : p,
        ),
      },
    }));
    return id;
  },

  removeField: (journeyId, formId, fieldId) =>
    setJourney(set, journeyId, (j) => ({
      ...j,
      formSchema: {
        ...j.formSchema,
        forms: j.formSchema.forms.map((p) =>
          isFormPage(p) && p.formId === formId
            ? { ...p, fields: p.fields.filter((f) => f.id !== fieldId) }
            : p,
        ),
      },
    })),

  updateField: (journeyId, formId, fieldId, patch) =>
    setJourney(set, journeyId, (j) => ({
      ...j,
      formSchema: {
        ...j.formSchema,
        forms: j.formSchema.forms.map((p) =>
          isFormPage(p) && p.formId === formId
            ? {
                ...p,
                fields: p.fields.map((f) =>
                  f.id === fieldId ? ({ ...f, ...patch } as typeof f) : f,
                ),
              }
            : p,
        ),
      },
    })),

  setFormNext: (journeyId, sourceNodeId, targetNodeId) => {
    const journey = get().project.journeys[journeyId];
    if (!journey) return;
    const token = nodeIdToToken(targetNodeId, journey);
    if (sourceNodeId === SUMMARY_NODE_ID) {
      get().setSummaryNext(journeyId, targetNodeId);
      return;
    }
    setJourney(set, journeyId, (j) => ({
      ...j,
      formSchema: {
        ...j.formSchema,
        forms: j.formSchema.forms.map((p) =>
          isFormPage(p) && p.formId === sourceNodeId ? { ...p, next: token } : p,
        ),
      },
    }));
  },

  setSummaryNext: (journeyId, targetNodeId) => {
    const journey = get().project.journeys[journeyId];
    if (!journey?.summarySchema) return;
    const token = nodeIdToToken(targetNodeId, journey);
    setJourney(set, journeyId, (j) =>
      j.summarySchema ? { ...j, summarySchema: { ...j.summarySchema, next: token } } : j,
    );
  },

  addNextWhen: (journeyId, formId, rule) =>
    setJourney(set, journeyId, (j) => ({
      ...j,
      formSchema: {
        ...j.formSchema,
        forms: j.formSchema.forms.map((p) => {
          if (!isFormPage(p) || p.formId !== formId) return p;
          const existing = p.nextWhen ?? [];
          // Replace if same fieldId+value, otherwise append.
          const idx = existing.findIndex(
            (r) => r.fieldId === rule.fieldId && r.value === rule.value,
          );
          const next =
            idx === -1
              ? [...existing, rule]
              : existing.map((r, i) => (i === idx ? rule : r));
          return { ...p, nextWhen: next };
        }),
      },
    })),

  removeNextWhen: (journeyId, formId, fieldId, value) =>
    setJourney(set, journeyId, (j) => ({
      ...j,
      formSchema: {
        ...j.formSchema,
        forms: j.formSchema.forms.map((p) => {
          if (!isFormPage(p) || p.formId !== formId) return p;
          const existing = p.nextWhen ?? [];
          const filtered = existing.filter(
            (r) => !(r.fieldId === fieldId && r.value === value),
          );
          if (filtered.length === existing.length) return p;
          const cp: FormPage = { ...p };
          if (filtered.length > 0) cp.nextWhen = filtered;
          else delete (cp as { nextWhen?: NextWhenRule[] }).nextWhen;
          return cp;
        }),
      },
    })),
    }),
    {
      name: STORAGE_KEY,
      // Only persist the schema-side of state — UI selections and the
      // active journey are session-scoped.
      partialize: (state) => ({ project: state.project }),
      version: 1,
    }
  )
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyProject(): Project {
  return {
    applicationId: '',
    taskList: { title: '' },
    journeys: {},
  };
}

function setJourney(
  set: (fn: (state: BuilderState) => Partial<BuilderState>) => void,
  journeyId: string,
  updater: (j: ProjectJourney) => ProjectJourney,
) {
  set((state) => {
    const j = state.project.journeys[journeyId];
    if (!j) return state;
    return {
      project: {
        ...state.project,
        journeys: {
          ...state.project.journeys,
          [journeyId]: updater(j),
        },
      },
    };
  });
}

function isFormPage(page: JourneyPage): page is FormPage {
  return page.type === undefined || page.type === 'form';
}

function collectIds(
  project: Project,
  journey: ProjectJourney,
): {
  formIds: Set<string>;
  hubIds: Set<string>;
  taskListIds: Set<string>;
  journeyIds: Set<string>;
} {
  const formIds = new Set<string>();
  const hubIds = new Set<string>();
  const taskListIds = new Set<string>();
  for (const p of journey.formSchema.forms) {
    if (isFormPage(p)) formIds.add(p.formId);
    else if (p.type === 'hub') hubIds.add(p.id);
    else if (p.type === 'task-list') taskListIds.add(p.id);
  }
  const journeyIds = new Set(Object.keys(project.journeys));
  return { formIds, hubIds, taskListIds, journeyIds };
}

function mergeFormPage(p: FormPage, patch: Partial<FormPage>): FormPage {
  // `Partial<FormPage>` includes optional `nextWhen` etc; spread is fine.
  return { ...p, ...patch };
}

function uniqueFieldId(existing: string[], prefix: string): string {
  for (let i = 1; i < 10000; i++) {
    const id = `${prefix}-${i}`;
    if (!existing.includes(id)) return id;
  }
  throw new Error('Exhausted field ids');
}

type MintedPage =
  | { kind: 'form' | 'hub' | 'task-list'; page: JourneyPage }
  | { kind: 'summary'; page: SummarySchema };

function mintPage(
  kind: AddPageKind,
  journey: ProjectJourney,
): { newPage: MintedPage; nodeId: string } {
  const existingFormIds = journey.formSchema.forms
    .filter(isFormPage)
    .map((p) => p.formId);
  const existingHubIds = journey.formSchema.forms
    .filter((p): p is HubPage => p.type === 'hub')
    .map((p) => p.id);
  const existingTlIds = journey.formSchema.forms
    .filter((p): p is TaskListJourneyPage => p.type === 'task-list')
    .map((p) => p.id);

  if (kind === 'form') {
    const formId = uniqueId(existingFormIds, 'form');
    const page: FormPage = {
      formId,
      title: 'New form',
      fields: [],
      next: '',
    };
    return { newPage: { kind: 'form', page }, nodeId: formId };
  }
  if (kind === 'hub') {
    const id = uniqueId(existingHubIds, 'hub');
    const page: HubPage = {
      type: 'hub',
      id,
      title: 'New hub',
      next: 'task-list',
      items: [],
    };
    return { newPage: { kind: 'hub', page }, nodeId: `${HUB_NODE_PREFIX}${id}` };
  }
  if (kind === 'task-list') {
    const id = uniqueId(existingTlIds, 'task-list');
    const page: TaskListJourneyPage = {
      type: 'task-list',
      id,
      title: 'New task list',
      tasks: [],
    };
    return {
      newPage: { kind: 'task-list', page },
      nodeId: `${TASKLIST_NODE_PREFIX}${id}`,
    };
  }
  // summary
  const page: SummarySchema = {
    journeyId: journey.formSchema.journeyId,
    title: 'Check your answers',
    next: 'task-list',
  };
  return { newPage: { kind: 'summary', page }, nodeId: SUMMARY_NODE_ID };
}

function uniqueId(existing: string[], prefix: string): string {
  for (let i = 1; i < 10000; i++) {
    const id = `${prefix}-${i}`;
    if (!existing.includes(id)) return id;
  }
  throw new Error('Exhausted ids');
}

function removePageById(j: ProjectJourney, nodeId: string): ProjectJourney {
  if (nodeId === SUMMARY_NODE_ID) {
    const layout = { ...j.layout };
    delete layout[nodeId];
    const { summarySchema: _drop, ...rest } = j;
    return { ...rest, layout };
  }
  if (nodeId.startsWith(EXTERNAL_NODE_PREFIX)) return j; // external is read-only
  const isHub = nodeId.startsWith(HUB_NODE_PREFIX);
  const isTl = nodeId.startsWith(TASKLIST_NODE_PREFIX);
  const realId = isHub
    ? nodeId.slice(HUB_NODE_PREFIX.length)
    : isTl
    ? nodeId.slice(TASKLIST_NODE_PREFIX.length)
    : nodeId;
  const layout = { ...j.layout };
  delete layout[nodeId];
  const nextForms = j.formSchema.forms.filter((p) => {
    if (isHub) return !(p.type === 'hub' && p.id === realId);
    if (isTl) return !(p.type === 'task-list' && p.id === realId);
    return !(isFormPage(p) && p.formId === realId);
  });
  // Clean up references on remaining forms.
  const cleanedForms = nextForms.map((p) => {
    if (!isFormPage(p)) return p;
    const next: FormPage = { ...p };
    if (next.next === realId) next.next = '';
    if (next.nextWhen) {
      const filtered = next.nextWhen.filter((r) => r.then !== realId);
      if (filtered.length === 0) {
        delete (next as { nextWhen?: NextWhenRule[] }).nextWhen;
      } else {
        next.nextWhen = filtered;
      }
    }
    return next;
  });
  const formOrder = isHub || isTl ? j.formOrder : j.formOrder.filter((id) => id !== realId);
  return {
    ...j,
    formSchema: { ...j.formSchema, forms: cleanedForms },
    formOrder,
    layout,
  };
}

/** Map a node id to the schema-level token it represents. */
function nodeIdToToken(nodeId: string, journey: ProjectJourney): string {
  if (nodeId === SUMMARY_NODE_ID) return 'summary';
  if (nodeId.startsWith(EXTERNAL_NODE_PREFIX)) {
    return nodeId.slice(EXTERNAL_NODE_PREFIX.length);
  }
  if (nodeId.startsWith(HUB_NODE_PREFIX) || nodeId.startsWith(TASKLIST_NODE_PREFIX)) {
    // Hubs / task-lists aren't valid form-level next targets, but if a user
    // does this we'll fall back to "journey-root" which lands on either of
    // them depending on what the journey defines.
    return 'journey-root';
  }
  // Same-journey form id.
  const exists = journey.formSchema.forms.some(
    (p) => isFormPage(p) && p.formId === nodeId,
  );
  return exists ? nodeId : nodeId;
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function buildProjectJourney(
  formSchema: FormSchema,
  summarySchema?: SummarySchema,
  layout: LayoutMap = {},
): ProjectJourney {
  return {
    formSchema,
    ...(summarySchema ? { summarySchema } : {}),
    formOrder: formOrderOf(formSchema),
    layout,
  };
}

export function selectActiveJourney(state: BuilderState): ProjectJourney | null {
  return state.project.journeys[state.activeJourneyId] ?? null;
}

export function roundTripSchemas(
  journeyId: string,
  journey: ProjectJourney,
): { formSchema: FormSchema; summarySchema?: SummarySchema } {
  const { nodes, edges } = schemaToCanvas({
    formSchema: journey.formSchema,
    ...(journey.summarySchema ? { summarySchema: journey.summarySchema } : {}),
    layout: journey.layout,
  });
  return canvasToSchema({
    journeyId,
    nodes,
    edges,
    formOrder: journey.formOrder,
    ...(journey.formSchema.looping ? { looping: journey.formSchema.looping } : {}),
    ...(journey.formSchema.schemaVersion
      ? { schemaVersion: journey.formSchema.schemaVersion }
      : {}),
  });
}
