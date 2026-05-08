/**
 * Drag-source palette of page types and field types. M3 wires the
 * dragstart payload into React Flow's onDrop for canvas-add. For M1 this
 * is just a static list so the layout's visible.
 */

const PAGES = [
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

import { PATTERNS } from '../patterns';
import { ProjectTree } from './ProjectTree';

export function Palette() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3 text-sm">
      <ProjectTree />
      <hr className="border-slate-200" />
      <Section title="Pages">
        {PAGES.map((p) => (
          <PaletteItem key={p.type} label={p.label} desc={p.desc} kind={`page:${p.type}`} />
        ))}
      </Section>
      <Section title="Fields">
        {FIELDS.map((f) => (
          <PaletteItem key={f.type} label={f.label} kind={`field:${f.type}`} />
        ))}
      </Section>
      <Section title="Patterns">
        {PATTERNS.map((p) => (
          <PaletteItem
            key={p.id}
            label={p.label}
            desc={p.description}
            kind={`pattern:${p.id}`}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function PaletteItem({
  label,
  desc,
  kind,
}: {
  label: string;
  desc?: string;
  kind: string;
}) {
  return (
    <div
      className="cursor-grab rounded border border-slate-200 bg-white px-2.5 py-1.5 hover:border-slate-400"
      draggable
      onDragStart={(e) => e.dataTransfer.setData('application/teleportal-builder', kind)}
    >
      <div className="text-sm">{label}</div>
      {desc ? <div className="text-xs text-slate-500">{desc}</div> : null}
    </div>
  );
}
