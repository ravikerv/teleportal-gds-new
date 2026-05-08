/**
 * Top-level dispatcher. Given a `schemaType`, routes to the appropriate
 * sub-renderer (FormRenderer / SummaryRenderer / TaskListRenderer /
 * ConfirmationRenderer / HubRenderer / JourneyTaskListRenderer). The
 * discriminated union of props makes the required prop set per schema
 * type type-safe at the call site.
 *
 * Server Component — no client hooks.
 */

import type { ReactElement } from 'react';

import type { FormAnswers, ParentState } from '../shared/types/journey.types';
import type {
  ConfirmationSchema,
  FieldOption,
  FormPage,
  HubPage,
  SummarySchema,
  TaskListJourneyPage,
  TaskListSchema,
} from '../shared/types/schema.types';
import { ConfirmationRenderer } from './ConfirmationRenderer';
import { FormRenderer } from './FormRenderer';
import { HubRenderer } from './HubRenderer';
import { JourneyTaskListRenderer } from './JourneyTaskListRenderer';
import { SummaryRenderer } from './SummaryRenderer';
import { TaskListRenderer } from './TaskListRenderer';

export type SchemaRendererProps =
  | {
      schemaType: 'form';
      applicationId: string;
      journeyId: string;
      schema: FormPage;
      values?: FormAnswers;
      errors?: Record<string, string>;
      dataSources?: Record<string, FieldOption[]>;
      submitLabel?: string;
      /** Looping-journey instance id; undefined for non-looping journeys. */
      instanceId?: string;
    }
  | {
      schemaType: 'summary';
      applicationId: string;
      journeyId: string;
      schema: SummarySchema;
      parent: ParentState;
    }
  | {
      schemaType: 'task-list';
      applicationId: string;
      schema: TaskListSchema;
      parent: ParentState;
    }
  | {
      schemaType: 'confirmation';
      applicationId: string;
      journeyId: string;
      schema: ConfirmationSchema;
      parent: ParentState;
    }
  | {
      schemaType: 'hub';
      applicationId: string;
      journeyId: string;
      schema: HubPage;
      parent: ParentState;
    }
  | {
      schemaType: 'journey-task-list';
      applicationId: string;
      journeyId: string;
      schema: TaskListJourneyPage;
      parent: ParentState;
    };

export function SchemaRenderer(props: SchemaRendererProps): ReactElement {
  switch (props.schemaType) {
    case 'form':
      return (
        <FormRenderer
          applicationId={props.applicationId}
          journeyId={props.journeyId}
          schema={props.schema}
          values={props.values}
          errors={props.errors}
          dataSources={props.dataSources}
          submitLabel={props.submitLabel}
          instanceId={props.instanceId}
        />
      );
    case 'summary':
      return (
        <SummaryRenderer
          applicationId={props.applicationId}
          journeyId={props.journeyId}
          schema={props.schema}
          parent={props.parent}
        />
      );
    case 'task-list':
      return (
        <TaskListRenderer
          applicationId={props.applicationId}
          schema={props.schema}
          parent={props.parent}
        />
      );
    case 'confirmation':
      return (
        <ConfirmationRenderer
          applicationId={props.applicationId}
          journeyId={props.journeyId}
          schema={props.schema}
          parent={props.parent}
        />
      );
    case 'hub':
      return (
        <HubRenderer
          applicationId={props.applicationId}
          journeyId={props.journeyId}
          schema={props.schema}
          parent={props.parent}
        />
      );
    case 'journey-task-list':
      return (
        <JourneyTaskListRenderer
          applicationId={props.applicationId}
          journeyId={props.journeyId}
          schema={props.schema}
          parent={props.parent}
        />
      );
  }
}
