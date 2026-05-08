import { beforeEach, describe, expect, it } from 'vitest';

import { BLOB_PATHS } from '../constants/index';
import type { ParentState } from '../types/journey.types';
import type { TaskListSchema } from '../types/schema.types';
import {
  clearDraft,
  computeTaskStatus,
  consumeDraft,
  loadJourney,
  loadParent,
  markJourneyCompleted,
  resolveDependencies,
  resolveValueFromPath,
  saveAnswers,
  saveDraft,
} from './data.utils';
import { ConcurrencyError, readBlob, resetStorageAdapter, writeBlob } from './storage.utils';

beforeEach(() => {
  resetStorageAdapter();
});

describe('data.utils — saveAnswers', () => {
  it('creates parent + per-journey blobs on first save', async () => {
    await saveAnswers('app-1', 'personal-details', 'name-page', {
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    const parent = await loadParent('app-1');
    const journey = await loadJourney('app-1', 'personal-details');

    expect(parent?.data.journeys['personal-details']?.answers['name-page']).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(journey?.data.answers['name-page']).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(parent?.data.journeys['personal-details']?.status).toBe('in-progress');
  });

  it('keeps parent and per-journey blobs in sync across multiple writes', async () => {
    await saveAnswers('app-2', 'personal-details', 'name-page', { firstName: 'Ada' });
    await saveAnswers('app-2', 'personal-details', 'dob-page', { dob: '1815-12-10' });

    const parent = await loadParent('app-2');
    const journey = await loadJourney('app-2', 'personal-details');

    expect(parent?.data.journeys['personal-details']?.answers).toEqual({
      'name-page': { firstName: 'Ada' },
      'dob-page': { dob: '1815-12-10' },
    });
    expect(journey?.data.answers).toEqual(parent?.data.journeys['personal-details']?.answers);
  });

  it('cross-journey: saving in journey A leaves journey B untouched', async () => {
    // Pre-seed parent with journey B in cannot-start.
    const seeded: ParentState = {
      applicationId: 'app-3',
      journeys: {
        b: {
          applicationId: 'app-3',
          journeyId: 'b',
          status: 'cannot-start',
          answers: {},
          updatedAt: new Date().toISOString(),
        },
      },
      system: {},
      updatedAt: new Date().toISOString(),
    };
    await writeBlob(BLOB_PATHS.parent('app-3'), seeded);

    await saveAnswers('app-3', 'a', 'page-1', { foo: 'bar' });

    const parent = await loadParent('app-3');
    expect(parent?.data.journeys['a']?.status).toBe('in-progress');
    expect(parent?.data.journeys['b']?.status).toBe('cannot-start');
  });

  it('throws ConcurrencyError when parent is mutated between read and write', async () => {
    await saveAnswers('app-4', 'j', 'page-1', { foo: 'bar' });

    // Force a mismatched etag by writing parent out-of-band.
    const parentBlob = await readBlob<ParentState>(BLOB_PATHS.parent('app-4'));
    const stale = parentBlob.etag;

    await writeBlob(BLOB_PATHS.parent('app-4'), parentBlob.data, stale); // first write ok
    // Anyone holding `stale` now races.
    await expect(
      writeBlob(BLOB_PATHS.parent('app-4'), parentBlob.data, stale),
    ).rejects.toBeInstanceOf(ConcurrencyError);
  });
});

describe('data.utils — resolveDependencies', () => {
  it('marks empty journeys as not-started', () => {
    const parent: ParentState = {
      applicationId: 'app',
      journeys: {
        a: {
          applicationId: 'app',
          journeyId: 'a',
          status: 'in-progress',
          answers: {},
          updatedAt: '',
        },
      },
      system: {},
      updatedAt: '',
    };
    const out = resolveDependencies(parent);
    expect(out.journeys['a']?.status).toBe('not-started');
  });

  it('marks journeys with answers as in-progress', () => {
    const parent: ParentState = {
      applicationId: 'app',
      journeys: {
        a: {
          applicationId: 'app',
          journeyId: 'a',
          status: 'not-started',
          answers: { 'p1': { x: 1 } },
          updatedAt: '',
        },
      },
      system: {},
      updatedAt: '',
    };
    const out = resolveDependencies(parent);
    expect(out.journeys['a']?.status).toBe('in-progress');
  });

  it('preserves completed and cannot-start statuses', () => {
    const parent: ParentState = {
      applicationId: 'app',
      journeys: {
        done: {
          applicationId: 'app',
          journeyId: 'done',
          status: 'completed',
          answers: {},
          updatedAt: '',
        },
        blocked: {
          applicationId: 'app',
          journeyId: 'blocked',
          status: 'cannot-start',
          answers: { p: { x: 1 } },
          updatedAt: '',
        },
      },
      system: {},
      updatedAt: '',
    };
    const out = resolveDependencies(parent);
    expect(out.journeys['done']?.status).toBe('completed');
    expect(out.journeys['blocked']?.status).toBe('cannot-start');
  });
});

describe('data.utils — markJourneyCompleted', () => {
  it('sets status to completed in both parent and per-journey blobs', async () => {
    await saveAnswers('app-c', 'pd', 'name-page', { firstName: 'Ada' });
    await markJourneyCompleted('app-c', 'pd');

    const parent = await loadParent('app-c');
    const journey = await loadJourney('app-c', 'pd');
    expect(parent?.data.journeys['pd']?.status).toBe('completed');
    expect(journey?.data.status).toBe('completed');
  });

  it('issues a placeholder system.referenceId when one is not set', async () => {
    await saveAnswers('app-r', 'pd', 'name-page', { firstName: 'Ada' });
    await markJourneyCompleted('app-r', 'pd');
    const parent = await loadParent('app-r');
    expect(parent?.data.system.referenceId).toMatch(/^REF-[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it('preserves an existing system.referenceId', async () => {
    // Pre-seed parent.json with a known referenceId.
    const ts = new Date().toISOString();
    await saveAnswers('app-x', 'pd', 'name-page', { firstName: 'Ada' });
    const before = await loadParent('app-x');
    if (!before) throw new Error('expected parent state to exist');
    const seeded = {
      ...before.data,
      system: { referenceId: 'EXTERNAL-12345' },
      updatedAt: ts,
    };
    const { writeBlob } = await import('./storage.utils');
    const { BLOB_PATHS } = await import('../constants/index');
    await writeBlob(BLOB_PATHS.parent('app-x'), seeded);

    await markJourneyCompleted('app-x', 'pd');
    const after = await loadParent('app-x');
    expect(after?.data.system.referenceId).toBe('EXTERNAL-12345');
  });
});

describe('data.utils — computeTaskStatus', () => {
  const schema: TaskListSchema = {
    title: 'Apply',
    tasks: [
      { id: 'a', label: 'A', status: 'not-started' },
      { id: 'b', label: 'B', status: 'not-started', dependsOn: ['a'] },
    ],
  };

  it('returns the runtime journey status when present', () => {
    const parent = {
      applicationId: 'x',
      journeys: {
        a: { applicationId: 'x', journeyId: 'a', status: 'completed' as const, answers: {}, updatedAt: '' },
      },
      system: {},
      updatedAt: '',
    };
    expect(computeTaskStatus(schema.tasks![0]!, parent, schema)).toBe('completed');
  });

  it('falls back to the schema status when no journey state exists', () => {
    const parent = { applicationId: 'x', journeys: {}, system: {}, updatedAt: '' };
    expect(computeTaskStatus(schema.tasks![0]!, parent, schema)).toBe('not-started');
  });

  it('forces cannot-start when a dependsOn task is incomplete', () => {
    const parent = {
      applicationId: 'x',
      journeys: {
        a: { applicationId: 'x', journeyId: 'a', status: 'in-progress' as const, answers: {}, updatedAt: '' },
      },
      system: {},
      updatedAt: '',
    };
    expect(computeTaskStatus(schema.tasks![1]!, parent, schema)).toBe('cannot-start');
  });

  it('clears cannot-start once every dependsOn task is completed', () => {
    const parent = {
      applicationId: 'x',
      journeys: {
        a: { applicationId: 'x', journeyId: 'a', status: 'completed' as const, answers: {}, updatedAt: '' },
      },
      system: {},
      updatedAt: '',
    };
    expect(computeTaskStatus(schema.tasks![1]!, parent, schema)).toBe('not-started');
  });
});

describe('data.utils — drafts', () => {
  it('saveDraft + consumeDraft round-trips and deletes the blob', async () => {
    await saveDraft('app', 'j', 'page-1', {
      values: { foo: 'bar' },
      errors: { foo: 'Invalid' },
    });
    const first = await consumeDraft('app', 'j', 'page-1');
    expect(first).toEqual({ values: { foo: 'bar' }, errors: { foo: 'Invalid' } });
    // Second consume returns null because consume is read-then-delete.
    expect(await consumeDraft('app', 'j', 'page-1')).toBeNull();
  });

  it('clearDraft is a no-op when no draft exists', async () => {
    await expect(clearDraft('app', 'j', 'page-1')).resolves.toBeUndefined();
  });

  it('clearDraft removes an existing draft', async () => {
    await saveDraft('app', 'j', 'page-1', { values: {}, errors: {} });
    await clearDraft('app', 'j', 'page-1');
    expect(await consumeDraft('app', 'j', 'page-1')).toBeNull();
  });
});

describe('data.utils — resolveValueFromPath', () => {
  const parent: ParentState = {
    applicationId: 'app',
    journeys: {
      pd: {
        applicationId: 'app',
        journeyId: 'pd',
        status: 'in-progress',
        answers: {
          'name-page': { firstName: 'Ada', lastName: 'Lovelace' },
        },
        updatedAt: '',
      },
    },
    system: { referenceId: 'REF-123' },
    updatedAt: '',
  };

  it('resolves a current-journey path', () => {
    expect(resolveValueFromPath(parent, 'pd', 'name-page.firstName')).toBe('Ada');
  });

  it('resolves a system path', () => {
    expect(resolveValueFromPath(parent, 'pd', 'system.referenceId')).toBe('REF-123');
  });

  it('returns undefined for unknown paths', () => {
    expect(resolveValueFromPath(parent, 'pd', 'name-page.middleName')).toBeUndefined();
    expect(resolveValueFromPath(parent, 'unknown', 'name-page.firstName')).toBeUndefined();
  });
});
