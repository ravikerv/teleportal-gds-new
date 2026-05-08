/**
 * Public schema-layer surface for the builder. Imports the canonical
 * teleportal-gds schema TYPES (type-only) and re-exports the bidirectional
 * canvas mapper so other modules don't dig into the file structure.
 */

export type {
  ConfirmationSchema,
  FormField,
  FormPage,
  FormSchema,
  HubItem,
  HubItemSource,
  HubPage,
  JourneyPage,
  NextWhenRule,
  SummaryEntriesBlock,
  SummaryEntryRow,
  SummaryRow,
  SummarySchema,
  TaskListFooterAction,
  TaskListItem,
  TaskListJourneyPage,
  TaskListSchema,
  TaskListSection,
  TaskStatus,
} from 'teleportal-gds';

export {
  EXTERNAL_NODE_PREFIX,
  HUB_NODE_PREFIX,
  SUMMARY_NODE_ID,
  TASKLIST_NODE_PREFIX,
  canvasToSchema,
  formOrderOf,
  schemaToCanvas,
} from './mapping';

export type {
  BuilderEdge,
  BuilderEdgeData,
  BuilderNode,
  BuilderNodeData,
  BuilderNodeKind,
  LayoutMap,
} from './mapping';
