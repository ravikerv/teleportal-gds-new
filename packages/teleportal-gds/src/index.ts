/**
 * TelePortal GDS — public API surface.
 *
 * Stable entry point. Server Actions live behind the `./actions` subpath
 * so the `'use server'` directive sits at the top of its own published
 * chunk for Next.js to wire up (see tsup.config.ts).
 */

export const VERSION = '0.1.0';

// ---------------------------------------------------------------------------
// Types — schema, journey, component shapes that consumers author against.
// ---------------------------------------------------------------------------

export type * from './shared/types/index';

// ---------------------------------------------------------------------------
// Constants — paths, type unions, lookup tables.
// ---------------------------------------------------------------------------

export {
  BLOB_PATHS,
  COMPONENT_TYPES,
  FIELD_TYPES,
  SCHEMA_TYPES,
  TASK_STATUSES,
} from './shared/constants/index';

// ---------------------------------------------------------------------------
// Utils — middleware layer (data, storage, navigation, validation, etc.).
// ---------------------------------------------------------------------------

export * from './shared/utils/index';

// ---------------------------------------------------------------------------
// Azure Blob storage adapter (opt-in). Consumers wire via:
//   setStorageAdapter(createAzureBlobStorageAdapter({ accountUrl, containerName }));
// Requires `@azure/storage-blob` and `@azure/identity` to be installed.
// ---------------------------------------------------------------------------

export { createAzureBlobStorageAdapter } from './shared/utils/storage-azure.utils';
export type { AzureBlobStorageOptions } from './shared/utils/storage-azure.utils';

// ---------------------------------------------------------------------------
// Wrapper components — every GovUK wrapper plus its prop types.
// ---------------------------------------------------------------------------

export * from './components/index';

// ---------------------------------------------------------------------------
// Design systems — the adapter contract, the GOV.UK default, and the
// registry. A client on another design system implements `DesignSystem`
// against the wrapper Props contracts and calls `configureDesignSystem`
// once at app startup; the engine picks it up everywhere.
// ---------------------------------------------------------------------------

export * from './design-systems/index';

// ---------------------------------------------------------------------------
// Engine — schema-driven renderers, registry, page-state loaders.
// ---------------------------------------------------------------------------

export { componentRegistry, renderField } from './engine/componentRegistry';
export type { FieldRenderContext } from './engine/componentRegistry';

export { FormRenderer, loadFormPageState } from './engine/FormRenderer';
export type { FormRendererProps, FormPageState } from './engine/FormRenderer';

export { SummaryRenderer, loadSummaryPageState } from './engine/SummaryRenderer';
export type { SummaryRendererProps, SummaryPageState } from './engine/SummaryRenderer';

export { TaskListRenderer, loadTaskListPageState } from './engine/TaskListRenderer';
export type { TaskListRendererProps, TaskListPageState } from './engine/TaskListRenderer';

export { ConfirmationRenderer, loadConfirmationPageState } from './engine/ConfirmationRenderer';
export type {
  ConfirmationRendererProps,
  ConfirmationPageState,
} from './engine/ConfirmationRenderer';

export { HubRenderer, loadJourneyEntryPageState } from './engine/HubRenderer';
export type { HubRendererProps, JourneyEntryPageState } from './engine/HubRenderer';

export { JourneyTaskListRenderer } from './engine/JourneyTaskListRenderer';
export type { JourneyTaskListRendererProps } from './engine/JourneyTaskListRenderer';

export {
  RemoveConfirmationRenderer,
  loadRemoveConfirmationPageState,
} from './engine/RemoveConfirmationRenderer';
export type {
  RemoveConfirmationRendererProps,
  RemoveConfirmationPageState,
} from './engine/RemoveConfirmationRenderer';

export { SchemaRenderer } from './engine/SchemaRenderer';
export type { SchemaRendererProps } from './engine/SchemaRenderer';
