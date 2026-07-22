import { describe, expect, it } from 'vitest';

import { MockProvider } from './providers/mock.js';
import { handleImport } from './server.js';
import type { GeneratedBundle } from './types.js';
import { validateBundle } from './validate.js';

function bundleWith(files: Record<string, unknown>): GeneratedBundle {
  return {
    applicationId: 'test-app',
    files: Object.entries(files).map(([path, data]) => ({
      path,
      json: JSON.stringify(data),
    })),
    assumptions: [],
  };
}

const GOOD = {
  'applications/a/task-list-schema.json': {
    title: 'App',
    tasks: [{ id: 'j1', label: 'Journey one', status: 'not-started' }],
  },
  'applications/a/j1/form-schemas.json': {
    journeyId: 'j1',
    forms: [
      {
        formId: 'gate',
        title: 'Gate',
        fields: [
          {
            id: 'flag',
            type: 'radio',
            label: 'Flag',
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ],
            validation: { required: true },
          },
        ],
        next: 'summary',
        nextWhen: [{ fieldId: 'flag', value: 'no', then: 'detail' }],
      },
      { formId: 'detail', title: 'Detail', fields: [], next: 'summary' },
    ],
  },
  'applications/a/j1/summary-schema.json': {
    journeyId: 'j1',
    title: 'Check',
    headerRows: [{ key: 'Flag', valueFrom: 'gate.flag', changeLink: 'gate' }],
    next: 'task-list',
  },
};

describe('validateBundle', () => {
  it('passes a fully-consistent bundle', () => {
    expect(validateBundle(bundleWith(GOOD))).toEqual([]);
  });

  it('flags unresolvable next tokens', () => {
    const bad = structuredClone(GOOD) as Record<string, any>;
    bad['applications/a/j1/form-schemas.json'].forms[1].next = 'nope';
    const issues = validateBundle(bundleWith(bad));
    expect(issues.some((i) => i.message.includes("next token 'nope'"))).toBe(true);
  });

  it('flags nextWhen values that are not field options', () => {
    const bad = structuredClone(GOOD) as Record<string, any>;
    bad['applications/a/j1/form-schemas.json'].forms[0].nextWhen[0].value = 'maybe';
    const issues = validateBundle(bundleWith(bad));
    expect(issues.some((i) => i.message.includes("value 'maybe'"))).toBe(true);
  });

  it('flags summary valueFrom paths that do not exist', () => {
    const bad = structuredClone(GOOD) as Record<string, any>;
    bad['applications/a/j1/summary-schema.json'].headerRows[0].valueFrom = 'gate.missing';
    const issues = validateBundle(bundleWith(bad));
    expect(issues.some((i) => i.message.includes("valueFrom 'gate.missing'"))).toBe(true);
  });

  it('flags task-list references to journeys not in the bundle', () => {
    const bad = structuredClone(GOOD) as Record<string, any>;
    bad['applications/a/task-list-schema.json'].tasks.push({
      id: 'ghost',
      label: 'Ghost',
      status: 'not-started',
    });
    const issues = validateBundle(bundleWith(bad));
    expect(issues.some((i) => i.message.includes("journey 'ghost'"))).toBe(true);
  });

  it('flags entries blocks whose child journey is missing or not looping back', () => {
    const bad = structuredClone(GOOD) as Record<string, any>;
    bad['applications/a/j1/summary-schema.json'].entries = {
      fromJourneyId: 'child',
      groupLabel: 'Entry {n}',
      addAnotherLabel: 'Add another',
      rows: [],
    };
    let issues = validateBundle(bundleWith(bad));
    expect(issues.some((i) => i.message.includes("'child' is not an emitted journey"))).toBe(true);

    bad['applications/a/child/form-schemas.json'] = {
      journeyId: 'child',
      forms: [{ formId: 'p', title: 'P', fields: [], next: 'parent-summary' }],
      looping: { parentJourneyId: 'wrong' },
    };
    issues = validateBundle(bundleWith(bad));
    expect(issues.some((i) => i.message.includes("must set looping.parentJourneyId"))).toBe(true);
  });
});

describe('handleImport pipeline', () => {
  it('returns parsed files and no issues with the mock provider', async () => {
    const result = await handleImport({ extract: { widgets: [] } }, new MockProvider());
    expect(result.applicationId).toBe('mock-import');
    expect(Object.keys(result.files)).toHaveLength(3);
    expect(result.issues).toEqual([]);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it('runs a repair round when the first bundle has errors', async () => {
    const broken = bundleWith({
      'applications/a/j1/form-schemas.json': {
        journeyId: 'j1',
        forms: [{ formId: 'f', title: 'F', fields: [], next: 'ghost-form' }],
      },
    });
    const fixed = bundleWith({
      'applications/a/j1/form-schemas.json': {
        journeyId: 'j1',
        forms: [{ formId: 'f', title: 'F', fields: [], next: 'summary' }],
      },
    });
    let repairCalled = false;
    const provider = {
      name: 'test',
      generateBundle: async () => broken,
      repairBundle: async () => {
        repairCalled = true;
        return fixed;
      },
    };
    const result = await handleImport({ extract: {} }, provider);
    expect(repairCalled).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});
