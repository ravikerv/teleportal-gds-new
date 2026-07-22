/**
 * Mock provider — returns a canned bundle regardless of input. Used by
 * tests and for end-to-end plumbing verification without an API key
 * (`LLM_PROVIDER=mock`).
 */

import type {
  BoardExtract,
  GeneratedBundle,
  LlmProvider,
  ValidationIssue,
} from '../types.js';

const FORM_SCHEMAS = {
  journeyId: 'your-details',
  forms: [
    {
      formId: 'name-page',
      title: 'What is your name?',
      fields: [
        {
          id: 'firstName',
          type: 'input',
          label: 'First name',
          validation: { required: true, maxLength: 50 },
        },
        {
          id: 'lastName',
          type: 'input',
          label: 'Last name',
          validation: { required: true },
        },
      ],
      next: 'contact-page',
    },
    {
      formId: 'contact-page',
      title: 'How can we contact you?',
      fields: [
        {
          id: 'email',
          type: 'input',
          inputType: 'email',
          label: 'Email address',
          validation: { required: true },
        },
      ],
      next: 'summary',
    },
  ],
};

const SUMMARY_SCHEMA = {
  journeyId: 'your-details',
  title: 'Check your answers',
  headerRows: [
    { key: 'First name', valueFrom: 'name-page.firstName', changeLink: 'name-page' },
    { key: 'Last name', valueFrom: 'name-page.lastName', changeLink: 'name-page' },
    { key: 'Email address', valueFrom: 'contact-page.email', changeLink: 'contact-page' },
  ],
  next: 'task-list',
};

const TASK_LIST = {
  title: 'Mock import (AI plumbing test)',
  sections: [
    {
      id: 'about-you',
      title: 'About you',
      tasks: [{ id: 'your-details', label: 'Your details', status: 'not-started' }],
    },
  ],
};

export class MockProvider implements LlmProvider {
  readonly name = 'mock';
  readonly requiresBoardExtract = false;

  async generateBundle(_extract: BoardExtract): Promise<GeneratedBundle> {
    return {
      applicationId: 'mock-import',
      files: [
        {
          path: 'applications/mock-import/task-list-schema.json',
          json: JSON.stringify(TASK_LIST),
        },
        {
          path: 'applications/mock-import/your-details/form-schemas.json',
          json: JSON.stringify(FORM_SCHEMAS),
        },
        {
          path: 'applications/mock-import/your-details/summary-schema.json',
          json: JSON.stringify(SUMMARY_SCHEMA),
        },
      ],
      assumptions: ['Mock provider: this bundle is canned, not derived from the board.'],
    };
  }

  async repairBundle(
    previous: GeneratedBundle,
    _issues: ValidationIssue[],
  ): Promise<GeneratedBundle> {
    return previous;
  }
}
