import { describe, expect, it } from 'vitest';

import {
  resolveBackPath,
  resolveChangeLinkPath,
  resolveJourneyEntryPath,
  resolveNextPath,
  resolveTaskListPath,
} from './navigation.utils';

describe('navigation.utils', () => {
  it('routes summary and confirmation special tokens', () => {
    expect(resolveNextPath('a1', 'pd', 'summary')).toBe('/applications/a1/journeys/pd/summary');
    expect(resolveNextPath('a1', 'pd', 'confirmation')).toBe(
      '/applications/a1/journeys/pd/confirmation',
    );
  });

  it('routes a regular formId as a journey form page', () => {
    expect(resolveNextPath('a1', 'pd', 'dob-page')).toBe(
      '/applications/a1/journeys/pd/dob-page',
    );
  });

  it('change-link path is the form page url', () => {
    expect(resolveChangeLinkPath('a1', 'pd', 'name-page')).toBe(
      '/applications/a1/journeys/pd/name-page',
    );
  });

  it('task-list path is the application root', () => {
    expect(resolveTaskListPath('a1')).toBe('/applications/a1');
  });

  it('journey entry path is the journey root', () => {
    expect(resolveJourneyEntryPath('a1', 'pd')).toBe('/applications/a1/journeys/pd');
  });

  it('back-link to a form id resolves to the form page', () => {
    expect(resolveBackPath('a1', 'pd', 'name-page')).toBe(
      '/applications/a1/journeys/pd/name-page',
    );
  });

  it('back-link special token "task-list" resolves to the application root', () => {
    expect(resolveBackPath('a1', 'pd', 'task-list')).toBe('/applications/a1');
  });

  it('back-link special token "summary" resolves to the summary page', () => {
    expect(resolveBackPath('a1', 'pd', 'summary')).toBe('/applications/a1/journeys/pd/summary');
  });
});
