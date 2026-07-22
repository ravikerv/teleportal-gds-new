/**
 * Palette of page types, field types, and patterns. Page and pattern
 * items add to the open journey two ways:
 *   - click  → inserted right of the current flow and selected
 *   - drag   → dropped at the cursor position on the canvas
 * Items disable themselves (with an explanatory tooltip) when no journey
 * is open, or when the journey already has its one hub/task-list/summary
 * (the schema mapper keeps a single slot for each, so a second would be
 * lost on round-trip).
 */

import { useCallback } from 'react';

import { PATTERNS } from '../patterns';
import { schemaToCanvas } from '../schema';
import {
  MASTER_VIEW_ID,
  selectActiveJourney,
  useBuilderStore,
  type AddPageKind,
} from '../store';
import { ProjectTree } from './ProjectTree';

const PAGES: { type: AddPageKind; label: string; desc: string }[] = [
  { type: 'form', label: 'Form', desc: 'Fields + validation + next' },
  { type: 'hub', label: 'Hub', desc: 'Manage page at journey root' },
  { type: 'task-list', label: 'Task list', desc: 'Sub-task list at journey root' },
  { type: 'summary', label: 'Summary', desc: 'Check-your-answers (with looping)' },
];

const FIELDS = [
  { type: 'input', label: 'Input' },
  { type: 'radio', label: 'Radio' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'select', label: 'Select' },
  { type: 'datepicker', label: 'Date' },
  { type: 'textarea', label: 'Textarea' },
];

/** Where a click-added page lands: right of the rightmost node, or a
 *  sensible spot on an empty canvas. Drag-adds still use the cursor. */
function nextFreePosition(
  journey: ReturnType<typeof selectActiveJourney>,
): { x: number; y: number } {
  if (!journey) return { x: 80, y: 240 };
  const { nodes } = schemaToCanvas({
    formSchema: journey.formSchema,
    ...(journey.summarySchema ? { summarySchema: journey.summarySchema } : {}),
    layout: journey.layout,
  });
  if (nodes.length === 0) return { x: 80, y: 240 };
  const rightmost = nodes.reduce((a, b) => (b.position.x > a.position.x ? b : a));
  return { x: rightmost.position.x + 260, y: rightmost.position.y };
}

export function Palette() {
  const activeJourneyId = useBuilderStore((s) => s.activeJourneyId);
  const journey = useBuilderStore(selectActiveJourney);
  const addPage = useBuilderStore((s) => s.addPage);
  const applyPattern = useBuilderStore((s) => s.applyPattern);
  const setSelectedNode = useBuilderStore((s) => s.setSelectedNode);

  const journeyOpen = activeJourneyId !== MASTER_VIEW_ID && !!journey;
  const hasHub = !!journey?.formSchema.forms.some((p) => p.type === 'hub');
  const hasTaskList = !!journey?.formSchema.forms.some((p) => p.type === 'task-list');
  const hasSummary = !!journey?.summarySchema;

  const disabledReason = (kind: AddPageKind): string | null => {
    if (!journeyOpen) return 'Open a journey from the project tree first';
    if (kind === 'hub' && hasHub) return 'This journey already has a hub';
    if (kind === 'task-list' && hasTaskList)
      return 'This journey already has a task list';
    if (kind === 'summary' && hasSummary)
      return 'This journey already has a summary';
    return null;
  };

  const handleAddPage = useCallback(
    (kind: AddPageKind) => {
      if (!activeJourneyId) return;
      const newId = addPage(activeJourneyId, kind, nextFreePosition(journey));
      if (newId) setSelectedNode(newId);
    },
    [activeJourneyId, journey, addPage, setSelectedNode],
  );

  const handleAddPattern = useCallback(
    (patternId: string) => {
      if (!activeJourneyId) return;
      const newId = applyPattern(activeJourneyId, patternId, nextFreePosition(journey));
      if (newId) setSelectedNode(newId);
    },
    [activeJourneyId, journey, applyPattern, setSelectedNode],
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3 text-sm">
      <ProjectTree />
      <hr className="border-slate-200" />
      <Section title="Pages" hint="Click to add, or drag onto the canvas">
        {PAGES.map((p) => (
          <PaletteItem
            key={p.type}
            label={p.label}
            desc={p.desc}
            kind={`page:${p.type}`}
            onAdd={() => handleAddPage(p.type)}
            disabledReason={disabledReason(p.type)}
          />
        ))}
      </Section>
      <Section title="Fields" hint="Edit a form's fields in the inspector">
        {FIELDS.map((f) => (
          <PaletteItem key={f.type} label={f.label} kind={`field:${f.type}`} />
        ))}
      </Section>
      <Section title="Patterns" hint="Pre-built page groups">
        {PATTERNS.map((p) => (
          <PaletteItem
            key={p.id}
            label={p.label}
            desc={p.description}
            kind={`pattern:${p.id}`}
            onAdd={() => handleAddPattern(p.id)}
            disabledReason={journeyOpen ? null : 'Open a journey from the project tree first'}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {hint ? <p className="mb-1.5 text-[11px] text-slate-400">{hint}</p> : null}
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function PaletteItem({
  label,
  desc,
  kind,
  onAdd,
  disabledReason,
}: {
  label: string;
  desc?: string;
  kind: string;
  /** Click-to-add handler; omit for drag-only items (fields). */
  onAdd?: () => void;
  disabledReason?: string | null;
}) {
  const disabled = !!disabledReason;
  const clickable = !!onAdd && !disabled;
  return (
    <button
      type="button"
      onClick={clickable ? onAdd : undefined}
      disabled={disabled}
      title={disabledReason ?? (onAdd ? `Add a ${label.toLowerCase()} page` : undefined)}
      className={`group flex w-full items-center justify-between rounded border bg-white px-2.5 py-1.5 text-left ${
        disabled
          ? 'cursor-not-allowed border-slate-100 opacity-45'
          : 'cursor-grab border-slate-200 hover:border-slate-400'
      }`}
      draggable={!disabled}
      onDragStart={(e) =>
        e.dataTransfer.setData('application/teleportal-builder', kind)
      }
    >
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {desc ? <span className="block text-xs text-slate-500">{desc}</span> : null}
      </span>
      {clickable ? (
        <span
          aria-hidden="true"
          className="ml-2 hidden shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 group-hover:inline"
        >
          + Add
        </span>
      ) : null}
    </button>
  );
}
