/**
 * Validation panel for the bottom drawer. Lists every cross-reference
 * problem found by `validateProject`. Each issue links to the journey
 * + node so users click once to jump there. Issues that carry a
 * `quickFix` get an inline button that applies the fix via the store
 * (e.g. "Set 'next' to 'task-list'", "Clear 'next'", "Remove rule").
 */

import { useMemo } from 'react';

import { useBuilderStore } from '../store';
import { validateProject, type Issue, type IssueSeverity, type QuickFix } from './checks';

export function ValidationPanel() {
  const project = useBuilderStore((s) => s.project);
  const setActiveJourney = useBuilderStore((s) => s.setActiveJourney);
  const setSelectedNode = useBuilderStore((s) => s.setSelectedNode);
  const updateFormPage = useBuilderStore((s) => s.updateFormPage);
  const removeNextWhen = useBuilderStore((s) => s.removeNextWhen);

  const issues = useMemo(() => validateProject(project), [project]);

  const grouped = useMemo(() => {
    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');
    return { errors, warnings };
  }, [issues]);

  const onJump = (issue: Issue) => {
    if (issue.journeyId) setActiveJourney(issue.journeyId);
    if (issue.nodeId) {
      queueMicrotask(() => setSelectedNode(issue.nodeId!));
    }
  };

  const onApply = (fix: QuickFix) => {
    switch (fix.kind) {
      case 'set-form-next':
        updateFormPage(fix.journeyId, fix.formId, { next: fix.value });
        break;
      case 'clear-form-next':
        updateFormPage(fix.journeyId, fix.formId, { next: '' });
        break;
      case 'remove-next-when':
        removeNextWhen(fix.journeyId, fix.formId, fix.fieldId, fix.value);
        break;
    }
  };

  if (issues.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-emerald-700">
        ✓ No issues
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto text-xs">
      <Group label="Errors" severity="error" issues={grouped.errors} onJump={onJump} onApply={onApply} />
      <Group label="Warnings" severity="warning" issues={grouped.warnings} onJump={onJump} onApply={onApply} />
    </div>
  );
}

function Group({
  label,
  severity,
  issues,
  onJump,
  onApply,
}: {
  label: string;
  severity: IssueSeverity;
  issues: Issue[];
  onJump: (i: Issue) => void;
  onApply: (fix: QuickFix) => void;
}) {
  if (issues.length === 0) return null;
  const colour =
    severity === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';
  return (
    <section>
      <h3 className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <span className={`rounded px-1.5 py-0.5 ${colour}`}>
          {issues.length} {label}
        </span>
      </h3>
      <ul className="flex flex-col gap-1">
        {issues.map((i, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 rounded border border-slate-200 bg-white p-2"
          >
            <button
              type="button"
              onClick={() => onJump(i)}
              className="flex-1 text-left hover:underline"
            >
              <div className="text-slate-800">{i.message}</div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {i.journeyId ? `journey: ${i.journeyId}` : 'master'}
                {i.nodeId ? ` · node: ${i.nodeId}` : ''}
              </div>
            </button>
            {i.quickFix ? (
              <button
                type="button"
                onClick={() => onApply(i.quickFix!)}
                className="shrink-0 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-slate-700"
              >
                {i.quickFix.label}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
