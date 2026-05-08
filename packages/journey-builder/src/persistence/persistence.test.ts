/**
 * Round-trip the demo project through ZIP export/import and assert the
 * schemas come back byte-equivalent. Layout side-cars are not persisted
 * (positions don't go in the JSON), so we only compare schema data.
 */

import { describe, expect, it } from 'vitest';

import { loadFixtureProject } from '../fixtures';
import { exportProjectZip } from './export';
import { importProjectZip } from './import';

describe('zip export → import round-trip', () => {
  it('preserves all schemas in the demo project', async () => {
    const original = loadFixtureProject();
    const blob = await exportProjectZip(original);
    const imported = await importProjectZip(blob);

    expect(imported.applicationId).toBe(original.applicationId);
    expect(imported.taskList).toEqual(original.taskList);
    expect(Object.keys(imported.journeys).sort()).toEqual(
      Object.keys(original.journeys).sort(),
    );
    for (const jid of Object.keys(original.journeys)) {
      expect(imported.journeys[jid]!.formSchema).toEqual(
        original.journeys[jid]!.formSchema,
      );
      expect(imported.journeys[jid]!.summarySchema).toEqual(
        original.journeys[jid]!.summarySchema,
      );
    }
  });
});
