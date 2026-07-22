/**
 * Whole-application walkthrough, opened in its own tab via `#/preview`.
 *
 * Simulates the runtime experience end-to-end from the master task list:
 * click a task → journey entry page (hub → task-list → first form) →
 * fill forms → `next` / first-matching `nextWhen` rule → summary → back
 * to the task list with the journey marked completed. Looping journeys
 * collect entries; "add another" starts a fresh instance.
 *
 * Everything is client-side and throwaway: the project is read from the
 * same localStorage the builder persists to (live-refreshed on change via
 * the storage event), answers live only in this tab's memory, and nothing
 * is ever written back.
 */

import { useCallback, useEffect, useState } from 'react';

import type {
  FormPage,
  HubPage,
  JourneyPage,
  TaskListItem,
  TaskListJourneyPage,
  TaskStatus,
} from '../schema';
import {
  STORAGE_KEY,
  useBuilderStore,
  type ProjectJourney,
} from '../store';
import { PreviewForm } from './PreviewForm';
import { PreviewHub } from './PreviewHub';
import { PreviewSummary, type MockEntries } from './PreviewSummary';
import { PreviewTaskList } from './PreviewTaskList';
import {
  SKIN_OPTIONS,
  SkinContext,
  loadSkin,
  saveSkin,
  skinClass,
  type PreviewSkinId,
} from './skin';
import './preview.css';

type Screen =
  | { view: 'master' }
  | { view: 'page'; journeyId: string; pageId: string };

/** journeyId → formId → fieldId → value */
type Answers = Record<string, Record<string, Record<string, string | string[]>>>;

const SUMMARY_PAGE = '__summary';

function isFormPage(p: JourneyPage): p is FormPage {
  return p.type === undefined || p.type === 'form';
}

function entryPageIdOf(journey: ProjectJourney): string {
  const hub = journey.formSchema.forms.find((p): p is HubPage => p.type === 'hub');
  if (hub) return `__hub:${hub.id}`;
  const tl = journey.formSchema.forms.find(
    (p): p is TaskListJourneyPage => p.type === 'task-list',
  );
  if (tl) return `__tasklist:${tl.id}`;
  const first = journey.formSchema.forms.find(isFormPage);
  if (first) return first.formId;
  return SUMMARY_PAGE;
}

function matchNextWhen(
  page: FormPage,
  values: Record<string, string | string[]>,
): { fieldId: string; value: string; then: string } | undefined {
  return (page.nextWhen ?? []).find((rule) => {
    const v = values[rule.fieldId];
    return Array.isArray(v) ? v.includes(rule.value) : v === rule.value;
  });
}

/** The child journey a branch token leads into, if any. */
function branchChildJourneyId(token: string): string | null {
  if (token.startsWith('add-instance:')) return token.slice('add-instance:'.length);
  if (token.startsWith('journey:')) return token.slice('journey:'.length);
  return null;
}

/** Formids along a same-journey default `next` chain from `startToken`. */
function chainFormIds(
  startToken: string,
  journey: ProjectJourney,
  stop: string[] = [],
): string[] {
  const ids: string[] = [];
  const stopSet = new Set(stop);
  const seen = new Set<string>();
  let cur: string | undefined = startToken;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const form: FormPage | undefined = journey.formSchema.forms.find(
      (p): p is FormPage => isFormPage(p) && p.formId === cur,
    );
    if (!form || stopSet.has(form.formId)) break;
    ids.push(form.formId);
    cur = form.next;
  }
  return ids;
}

/**
 * Drop everything collected down an abandoned branch: a child journey's
 * whole answer bag, or — for a same-journey branch — the target form and
 * the forms its default `next` chain leads through. Forms in `keep` (the
 * new branch's own chain) are protected in case the routes reconverge.
 */
function clearAbandonedBranch(
  token: string,
  journeyId: string,
  journey: ProjectJourney,
  answers: Answers,
  keep: Set<string> = new Set(),
): Answers {
  const childId = branchChildJourneyId(token);
  if (childId) {
    if (!(childId in answers)) return answers;
    const next = { ...answers };
    delete next[childId];
    return next;
  }
  // Same-journey form chain, stopping where the new path reconverges.
  const bag = { ...answers[journeyId] };
  for (const formId of chainFormIds(token, journey, [...keep])) {
    delete bag[formId];
  }
  return { ...answers, [journeyId]: bag };
}

/** Flatten possibly-array answers to strings for hub/summary resolution. */
function stringified(
  bag: Record<string, Record<string, string | string[]>> | undefined,
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [formId, fields] of Object.entries(bag ?? {})) {
    out[formId] = {};
    for (const [fieldId, v] of Object.entries(fields)) {
      out[formId][fieldId] = Array.isArray(v) ? v.join(', ') : v;
    }
  }
  return out;
}

export function JourneyPreviewApp() {
  const project = useBuilderStore((s) => s.project);

  // Live-refresh when the builder tab saves the project.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) void useBuilderStore.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const [skin, setSkin] = useState<PreviewSkinId>(loadSkin);
  const sk = (cls: string): string => skinClass(skin, cls);

  const [screen, setScreen] = useState<Screen>({ view: 'master' });
  const [history, setHistory] = useState<Screen[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<Record<string, MockEntries>>({});

  const go = useCallback((next: Screen) => {
    setScreen((current) => {
      setHistory((h) => [...h, current]);
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const previous = h[h.length - 1]!;
      setScreen(previous);
      return h.slice(0, -1);
    });
  }, []);

  /**
   * Follow a navigation token from within `journeyId`. `bag` carries the
   * freshest answers when the caller has just written them in the same
   * tick (React state is not yet updated) — banking a looping entry must
   * include the submission that triggered the navigation.
   */
  const followToken = useCallback(
    (token: string, journeyId: string, bag?: Answers) => {
      const journey = project.journeys[journeyId];
      if (!token || !journey) return;
      const latest = bag ?? answers;

      if (token === 'task-list') {
        setCompleted((c) => new Set(c).add(journeyId));
        go({ view: 'master' });
        return;
      }
      if (token === 'summary') {
        go({ view: 'page', journeyId, pageId: SUMMARY_PAGE });
        return;
      }
      if (token === 'journey-root') {
        go({ view: 'page', journeyId, pageId: entryPageIdOf(journey) });
        return;
      }
      if (token === 'parent-summary') {
        const parentId = journey.formSchema.looping?.parentJourneyId;
        if (!parentId || !project.journeys[parentId]) return;
        // Bank this instance's answers as an entry, then reset for next time.
        setEntries((e) => ({
          ...e,
          [journeyId]: [...(e[journeyId] ?? []), { answers: stringified(latest[journeyId]) }],
        }));
        setAnswers((a) => ({ ...a, [journeyId]: {} }));
        go({ view: 'page', journeyId: parentId, pageId: SUMMARY_PAGE });
        return;
      }
      if (token.startsWith('add-instance:')) {
        const childId = token.slice('add-instance:'.length);
        const child = project.journeys[childId];
        if (!child) return;
        setAnswers((a) => ({ ...a, [childId]: {} }));
        go({ view: 'page', journeyId: childId, pageId: entryPageIdOf(child) });
        return;
      }
      if (token.startsWith('journey:')) {
        const targetId = token.slice('journey:'.length);
        const target = project.journeys[targetId];
        if (!target) return;
        go({ view: 'page', journeyId: targetId, pageId: entryPageIdOf(target) });
        return;
      }
      // Same-journey page id.
      const page = journey.formSchema.forms.find((p) => {
        if (isFormPage(p)) return p.formId === token;
        if (p.type === 'hub') return `__hub:${p.id}` === token || p.id === token;
        return `__tasklist:${p.id}` === token || p.id === token;
      });
      if (page) {
        const pageId = isFormPage(page)
          ? page.formId
          : page.type === 'hub'
            ? `__hub:${page.id}`
            : `__tasklist:${page.id}`;
        go({ view: 'page', journeyId, pageId });
      }
    },
    [project, answers, go],
  );

  const openTask = useCallback(
    (task: TaskListItem) => {
      const ref = task.type === 'nested-journey' ? task.journeyRef : task.id;
      const journey = project.journeys[ref];
      if (!journey) return; // referenced but not built — stays informational
      go({ view: 'page', journeyId: ref, pageId: entryPageIdOf(journey) });
    },
    [project, go],
  );

  const statusOf = useCallback(
    (task: TaskListItem): TaskStatus => {
      const ref = task.type === 'nested-journey' ? task.journeyRef : task.id;
      return completed.has(ref) ? 'completed' : task.status;
    },
    [completed],
  );

  const submitForm = useCallback(
    (journeyId: string, page: FormPage, values: Record<string, string | string[]>) => {
      const journey = project.journeys[journeyId];
      if (!journey) return;

      const prevValues = answers[journeyId]?.[page.formId];
      const prevRule = prevValues ? matchNextWhen(page, prevValues) : undefined;
      const nowRule = matchNextWhen(page, values);

      let nextAnswers: Answers = {
        ...answers,
        [journeyId]: { ...answers[journeyId], [page.formId]: values },
      };

      // Re-answering a branching question abandons the branch it used to
      // take: clear everything that was collected down that path so the
      // summary can't resurrect answers from a route that no longer applies.
      if (prevRule && prevRule !== nowRule) {
        const nowTarget = nowRule?.then ?? page.next;
        nextAnswers = clearAbandonedBranch(
          prevRule.then,
          journeyId,
          journey,
          nextAnswers,
          new Set([page.formId, ...chainFormIds(nowTarget, journey, [page.formId])]),
        );
        const childId = branchChildJourneyId(prevRule.then);
        if (childId) {
          setEntries((e) => {
            if (!(childId in e)) return e;
            const next = { ...e };
            delete next[childId];
            return next;
          });
        }
      }

      setAnswers(nextAnswers);
      followToken(nowRule?.then ?? page.next, journeyId, nextAnswers);
    },
    [project, answers, followToken],
  );

  // ---------------------------------------------------------------------
  // Screen rendering
  // ---------------------------------------------------------------------

  let content: React.ReactNode = null;
  if (screen.view === 'master') {
    content = (
      <PreviewTaskList
        source={project.taskList}
        isMaster
        onTaskClick={openTask}
        statusOf={statusOf}
      />
    );
  } else {
    const journey = project.journeys[screen.journeyId];
    if (!journey) {
      content = <p className={sk('govuk-body')}>This journey no longer exists.</p>;
    } else if (screen.pageId === SUMMARY_PAGE) {
      const summary = journey.summarySchema;
      content = summary ? (
        <PreviewSummary
          schema={summary}
          mockAnswers={stringified(answers[screen.journeyId])}
          mockEntries={summary.entries ? entries[summary.entries.fromJourneyId] ?? [] : []}
          onContinue={() => followToken(summary.next, screen.journeyId)}
          onAddAnother={() =>
            summary.entries &&
            followToken(`add-instance:${summary.entries.fromJourneyId}`, screen.journeyId)
          }
          onChangeRow={(formId) => followToken(formId, screen.journeyId)}
        />
      ) : (
        <p className={sk('govuk-body')}>This journey has no summary page.</p>
      );
    } else if (screen.pageId.startsWith('__hub:')) {
      const id = screen.pageId.slice('__hub:'.length);
      const hub = journey.formSchema.forms.find(
        (p): p is HubPage => p.type === 'hub' && p.id === id,
      );
      content = hub ? (
        <PreviewHub
          page={hub}
          mockAnswers={stringified(answers[screen.journeyId])}
          onItemLink={(item) => followToken(item.link, screen.journeyId)}
          onContinue={() => followToken(hub.next, screen.journeyId)}
        />
      ) : null;
    } else if (screen.pageId.startsWith('__tasklist:')) {
      const id = screen.pageId.slice('__tasklist:'.length);
      const tl = journey.formSchema.forms.find(
        (p): p is TaskListJourneyPage => p.type === 'task-list' && p.id === id,
      );
      content = tl ? (
        <PreviewTaskList source={tl} onTaskClick={openTask} statusOf={statusOf} />
      ) : null;
    } else {
      const form = journey.formSchema.forms.find(
        (p): p is FormPage => isFormPage(p) && p.formId === screen.pageId,
      );
      content = form ? (
        <PreviewForm
          key={`${screen.journeyId}:${form.formId}`}
          page={form}
          mockAnswers={answers[screen.journeyId]?.[form.formId] ?? {}}
          onContinue={(values) => submitForm(screen.journeyId, form, values)}
        />
      ) : (
        <p className={sk('govuk-body')}>Page not found in this journey.</p>
      );
    }
  }

  return (
    <SkinContext.Provider value={skin}>
      <div
        className={`${skin === 'nhsuk' ? 'nhsuk-scope ' : ''}${sk('govuk-template__body')} min-h-screen bg-white`}
      >
        <header
          className={`px-4 py-3 text-white ${skin === 'nhsuk' ? 'bg-[#005eb8]' : 'bg-black'}`}
        >
          <div className="mx-auto flex max-w-[960px] items-center justify-between gap-3">
            <span className="text-lg font-bold">
              {project.taskList.title || 'TelePortal service'}
            </span>
            <span className="flex items-center gap-2">
              <label htmlFor="walkthrough-design-system" className="text-xs text-white/80">
                Design system
              </label>
              <select
                id="walkthrough-design-system"
                value={skin}
                onChange={(e) => {
                  const id = e.target.value as PreviewSkinId;
                  setSkin(id);
                  saveSkin(id);
                }}
                className="rounded border border-white/40 bg-transparent px-2 py-0.5 text-xs text-white [&>option]:text-black"
              >
                {SKIN_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                Preview
              </span>
            </span>
          </div>
        </header>
        <div
          className={`border-b-4 ${skin === 'nhsuk' ? 'border-[#003087]' : 'border-[#1d70b8]'}`}
        />
        <div className={sk('govuk-width-container')}>
          {/* Skin-neutral banner (NHS has no phase-banner component). */}
          <div className="border-b border-slate-200 py-2">
            <p className="m-0 text-sm text-slate-700">
              <strong className="mr-2 rounded bg-slate-700 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                Preview
              </strong>
              Interactive walkthrough — answers live only in this tab and are never saved.
            </p>
          </div>
          {history.length > 0 ? (
            <a
              className={sk('govuk-back-link')}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                goBack();
              }}
            >
              Back
            </a>
          ) : null}
          <main className={sk('govuk-main-wrapper')} id="main-content">
            <div className={sk('govuk-grid-row')}>
              <div className={sk('govuk-grid-column-two-thirds')}>{content}</div>
            </div>
          </main>
        </div>
      </div>
    </SkinContext.Provider>
  );
}
