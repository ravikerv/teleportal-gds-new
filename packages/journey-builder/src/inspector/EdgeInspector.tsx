/**
 * Edge inspector. Two modes depending on the edge's data.condition:
 *
 *   - Default edge (the form's `next`): read-only source/target with a
 *     "drag the endpoint to retarget" hint. Delete clears the source's
 *     `next` to '' (effectively "unconfigured").
 *   - Conditional edge (a `nextWhen` rule): editable fieldId/value/then,
 *     plus a delete that removes the rule from the form.
 */

import { useMemo } from 'react';

import {
  schemaToCanvas,
  type BuilderEdge,
  EXTERNAL_NODE_PREFIX,
  HUB_NODE_PREFIX,
  SUMMARY_NODE_ID,
  TASKLIST_NODE_PREFIX,
} from '../schema';
import { selectActiveJourney, useBuilderStore } from '../store';
import { ActionButton, Field, Section, TextInput } from './controls';

export function EdgeInspector() {
  const journeyId = useBuilderStore((s) => s.activeJourneyId);
  const journey = useBuilderStore(selectActiveJourney);
  const selectedEdgeId = useBuilderStore((s) => s.selectedEdgeId);
  const setSelectedEdge = useBuilderStore((s) => s.setSelectedEdge);
  const updateFormPage = useBuilderStore((s) => s.updateFormPage);
  const updateSummary = useBuilderStore((s) => s.updateSummary);

  const edge = useMemo<BuilderEdge | null>(() => {
    if (!journey || !selectedEdgeId) return null;
    const { edges } = schemaToCanvas({
      formSchema: journey.formSchema,
      ...(journey.summarySchema ? { summarySchema: journey.summarySchema } : {}),
    });
    return edges.find((e) => e.id === selectedEdgeId) ?? null;
  }, [journey, selectedEdgeId]);

  if (!edge || !journey) return null;
  const isConditional = !!edge.data?.condition;
  const sourceLabel = formatNodeId(edge.source);
  const targetLabel = formatNodeId(edge.target);

  // Source might be a form id, the summary id, or (rarely) a hub/task-list.
  // For default-edge ops we only support form + summary as sources.
  const sourceIsSummary = edge.source === SUMMARY_NODE_ID;
  const sourceIsForm = !sourceIsSummary && !isPrefix(edge.source);

  const onDelete = () => {
    if (sourceIsForm) {
      const formId = edge.source;
      const page = journey.formSchema.forms.find(
        (p) =>
          (p.type === undefined || p.type === 'form') &&
          (p as { formId: string }).formId === formId,
      );
      if (!page) return;
      if (isConditional) {
        const cond = edge.data!.condition!;
        const next = (page as { nextWhen?: { fieldId: string; value: string }[] }).nextWhen?.filter(
          (r) => !(r.fieldId === cond.fieldId && r.value === cond.value),
        );
        updateFormPage(journeyId, formId, {
          nextWhen: next && next.length > 0 ? (next as never) : undefined,
        });
      } else {
        updateFormPage(journeyId, formId, { next: '' });
      }
    } else if (sourceIsSummary) {
      // Summary only has a default `next`.
      updateSummary(journeyId, { next: '' });
    }
    setSelectedEdge(null);
  };

  const onUpdateConditional = (patch: { fieldId?: string; value?: string; then?: string }) => {
    if (!sourceIsForm || !isConditional) return;
    const formId = edge.source;
    const cond = edge.data!.condition!;
    const page = journey.formSchema.forms.find(
      (p) =>
        (p.type === undefined || p.type === 'form') &&
        (p as { formId: string }).formId === formId,
    ) as undefined | { nextWhen?: { fieldId: string; value: string; then: string }[] };
    if (!page) return;
    const rules = page.nextWhen ?? [];
    const next = rules.map((r) =>
      r.fieldId === cond.fieldId && r.value === cond.value
        ? { ...r, ...patch }
        : r,
    );
    updateFormPage(journeyId, formId, { nextWhen: next as never });
  };

  return (
    <div className="flex flex-col gap-3">
      <Section title={isConditional ? 'Conditional edge' : 'Default edge'}>
        <Field label="From">
          <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">
            {sourceLabel}
          </div>
        </Field>
        <Field label="To">
          <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">
            {targetLabel}
          </div>
        </Field>
        {isConditional ? (
          <>
            <Field label="When field id">
              <TextInput
                value={edge.data!.condition!.fieldId}
                onChange={(v) => onUpdateConditional({ fieldId: v })}
                monospace
              />
            </Field>
            <Field label="Equals value">
              <TextInput
                value={edge.data!.condition!.value}
                onChange={(v) => onUpdateConditional({ value: v })}
              />
            </Field>
          </>
        ) : (
          <p className="rounded border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500">
            Drag the edge endpoint to retarget. To delete the default
            <code className="mx-1">next</code>, click "Delete edge" — the
            source page's <code>next</code> will be cleared.
          </p>
        )}
      </Section>
      <ActionButton variant="danger" onClick={onDelete}>
        Delete edge
      </ActionButton>
    </div>
  );
}

function isPrefix(id: string) {
  return (
    id.startsWith(EXTERNAL_NODE_PREFIX) ||
    id.startsWith(HUB_NODE_PREFIX) ||
    id.startsWith(TASKLIST_NODE_PREFIX)
  );
}

function formatNodeId(id: string): string {
  if (id === SUMMARY_NODE_ID) return 'summary';
  if (id.startsWith(EXTERNAL_NODE_PREFIX)) return id.slice(EXTERNAL_NODE_PREFIX.length);
  if (id.startsWith(HUB_NODE_PREFIX)) return `hub: ${id.slice(HUB_NODE_PREFIX.length)}`;
  if (id.startsWith(TASKLIST_NODE_PREFIX))
    return `task list: ${id.slice(TASKLIST_NODE_PREFIX.length)}`;
  return id;
}
