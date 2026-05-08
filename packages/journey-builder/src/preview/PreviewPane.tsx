/**
 * Preview pane shown in the bottom drawer's "Preview" tab.
 *
 *   - Auto-detects what to preview from the current selection (form / hub
 *     / task-list / summary) or, in master view, the master task list.
 *   - Mock data is a JSON textarea where authors paste the parent state
 *     to drive conditional reveals, summary headerRows, looping summaries
 *     with N entries, etc. Defaults to {} — the preview shows empty values.
 *   - GovUK Frontend CSS is loaded lazily from this module via a CSS
 *     import; a wrapping `.govuk-template__body` div scopes the styles.
 */

import { useMemo, useState } from 'react';

import {
  EXTERNAL_NODE_PREFIX,
  HUB_NODE_PREFIX,
  SUMMARY_NODE_ID,
  TASKLIST_NODE_PREFIX,
  type FormPage,
  type HubPage,
  type TaskListJourneyPage,
} from '../schema';
import { MASTER_VIEW_ID, selectActiveJourney, useBuilderStore } from '../store';
import { PreviewForm } from './PreviewForm';
import { PreviewHub } from './PreviewHub';
import { PreviewSummary, type MockEntries } from './PreviewSummary';
import { PreviewTaskList } from './PreviewTaskList';
import './preview.css';

type MockState = {
  /** Per-form answers, keyed by formId → fieldId → string. */
  answers?: Record<string, Record<string, string>>;
  /** Mock entries for the looping child journey referenced by a summary. */
  entries?: MockEntries;
};

const DEFAULT_MOCK = `{
  "answers": {},
  "entries": []
}`;

export function PreviewPane() {
  const activeJourneyId = useBuilderStore((s) => s.activeJourneyId);
  const journey = useBuilderStore(selectActiveJourney);
  const project = useBuilderStore((s) => s.project);
  const selectedNodeId = useBuilderStore((s) => s.selectedNodeId);

  const [mockText, setMockText] = useState(DEFAULT_MOCK);
  const mock = useMemo<MockState>(() => safeParse(mockText), [mockText]);

  const target = useMemo(() => {
    if (activeJourneyId === MASTER_VIEW_ID) {
      return { kind: 'master' as const };
    }
    if (!journey) return null;

    if (selectedNodeId) {
      if (selectedNodeId === SUMMARY_NODE_ID && journey.summarySchema) {
        return { kind: 'summary' as const, schema: journey.summarySchema };
      }
      if (selectedNodeId.startsWith(HUB_NODE_PREFIX)) {
        const id = selectedNodeId.slice(HUB_NODE_PREFIX.length);
        const page = journey.formSchema.forms.find(
          (p): p is HubPage => p.type === 'hub' && p.id === id,
        );
        if (page) return { kind: 'hub' as const, page };
      }
      if (selectedNodeId.startsWith(TASKLIST_NODE_PREFIX)) {
        const id = selectedNodeId.slice(TASKLIST_NODE_PREFIX.length);
        const page = journey.formSchema.forms.find(
          (p): p is TaskListJourneyPage => p.type === 'task-list' && p.id === id,
        );
        if (page) return { kind: 'task-list' as const, page };
      }
      if (selectedNodeId.startsWith(EXTERNAL_NODE_PREFIX)) return null;
      const formPage = journey.formSchema.forms.find(
        (p): p is FormPage =>
          (p.type === undefined || p.type === 'form') &&
          (p as { formId: string }).formId === selectedNodeId,
      );
      if (formPage) {
        return { kind: 'form' as const, page: formPage };
      }
    }

    // No selection on a journey canvas → preview the most "entry-like"
    // page (hub > task-list > summary > first form), so the user always
    // sees something.
    const hub = journey.formSchema.forms.find(
      (p): p is HubPage => p.type === 'hub',
    );
    if (hub) return { kind: 'hub' as const, page: hub };
    const taskList = journey.formSchema.forms.find(
      (p): p is TaskListJourneyPage => p.type === 'task-list',
    );
    if (taskList) return { kind: 'task-list' as const, page: taskList };
    if (journey.summarySchema) {
      return { kind: 'summary' as const, schema: journey.summarySchema };
    }
    const firstForm = journey.formSchema.forms.find(
      (p): p is FormPage => p.type === undefined || p.type === 'form',
    );
    if (firstForm) return { kind: 'form' as const, page: firstForm };
    return null;
  }, [activeJourneyId, journey, selectedNodeId]);

  return (
    <div className="grid h-full grid-cols-[2fr_1fr] gap-3 overflow-hidden">
      <div className="overflow-y-auto rounded border border-slate-200 bg-white p-4">
        <div className="govuk-template__body" style={{ background: 'transparent' }}>
          <div className="govuk-width-container">
            <main className="govuk-main-wrapper">
              {target?.kind === 'master' ? (
                <PreviewTaskList source={project.taskList} isMaster />
              ) : target?.kind === 'form' ? (
                <PreviewForm
                  page={target.page}
                  mockAnswers={mock.answers?.[target.page.formId] ?? {}}
                />
              ) : target?.kind === 'hub' ? (
                <PreviewHub page={target.page} mockAnswers={mock.answers ?? {}} />
              ) : target?.kind === 'task-list' ? (
                <PreviewTaskList source={target.page} />
              ) : target?.kind === 'summary' ? (
                <PreviewSummary
                  schema={target.schema}
                  mockAnswers={mock.answers ?? {}}
                  mockEntries={mock.entries ?? []}
                />
              ) : (
                <p className="govuk-body">Nothing to preview. Select a node on the canvas.</p>
              )}
            </main>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-col overflow-hidden rounded border border-slate-200 bg-white p-3 text-xs">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Mock data (JSON)
          </h3>
          <button
            type="button"
            onClick={() => setMockText(DEFAULT_MOCK)}
            className="rounded px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
          >
            reset
          </button>
        </div>
        <p className="mb-2 text-[11px] text-slate-500">
          <code>answers</code> drives form pre-fills, hub source matching,
          summary header rows. <code>entries</code> drives looping summary
          previews (one entry per array element).
        </p>
        <textarea
          value={mockText}
          onChange={(e) => setMockText(e.target.value)}
          className="flex-1 resize-none rounded border border-slate-200 p-2 font-mono text-[11px]"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function safeParse(text: string): MockState {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null) return parsed as MockState;
  } catch {
    // ignore
  }
  return {};
}
