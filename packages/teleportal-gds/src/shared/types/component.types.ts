/**
 * Types shared between the engine, the wrapper components, and the
 * validation/data utils. Anything UI-facing that crosses module
 * boundaries lives here.
 */

import type { FieldType } from './schema.types';

/**
 * Every wrapper component the library ships. The componentRegistry is keyed
 * by `FieldType` only; the remaining values name programmatic wrappers
 * (Button, ErrorSummary, SummaryList, TaskList) that the engine instantiates
 * directly rather than via the field-type lookup.
 */
export type ComponentType = FieldType | 'button' | 'error-summary' | 'summary-list' | 'task-list';

/** A single field-level error. Shaped for the ErrorSummary and inline messages. */
export type FieldError = {
  fieldId: string;
  message: string;
};

/**
 * Result of `validation.utils.validateAndCollect`. Shape lifted directly
 * from IMPLEMENTATION_PROMPT.md so the ErrorSummary can consume it without
 * further mapping.
 */
export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; errors: Record<string, string> };
