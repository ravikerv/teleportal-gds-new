/**
 * Design-system adapter contract.
 *
 * TelePortal GDS renders journeys from JSON schemas through a set of
 * component contracts — the wrapper Props types that have always been the
 * library's stable API. A design system is an object that supplies one
 * component per contract plus a small token map for the typographic and
 * layout classes the engine emits directly.
 *
 * GOV.UK is the built-in default (see ./govuk.ts). A client with a
 * different design system ships their own adapter implementing the same
 * contracts and registers it once at app startup via
 * `configureDesignSystem` — no engine, schema, storage, or navigation
 * code changes.
 */

import type { ComponentType } from 'react';

import type { BackLinkProps } from '../components/BackLink';
import type { ButtonProps } from '../components/Button';
import type { CheckboxProps } from '../components/Checkbox';
import type { CookieBannerProps } from '../components/CookieBanner';
import type { DatePickerProps } from '../components/DatePicker';
import type { ErrorSummaryProps } from '../components/ErrorSummary';
import type { FooterProps } from '../components/Footer';
import type { HeaderProps } from '../components/Header';
import type { InputProps } from '../components/Input';
import type { PanelProps } from '../components/Panel';
import type { RadioProps } from '../components/Radio';
import type { SelectProps } from '../components/Select';
import type { SummaryListProps } from '../components/SummaryList';
import type { TaskListProps } from '../components/TaskList';
import type { TextAreaProps } from '../components/TextArea';

/** One component per contract. Field components + page furniture. */
export type DesignSystemComponents = {
  // Field components (dispatched by field `type` in form schemas).
  Input: ComponentType<InputProps>;
  Select: ComponentType<SelectProps>;
  Radio: ComponentType<RadioProps>;
  Checkbox: ComponentType<CheckboxProps>;
  DatePicker: ComponentType<DatePickerProps>;
  TextArea: ComponentType<TextAreaProps>;
  // Page-level components used by the engine's renderers.
  Button: ComponentType<ButtonProps>;
  BackLink: ComponentType<BackLinkProps>;
  ErrorSummary: ComponentType<ErrorSummaryProps>;
  SummaryList: ComponentType<SummaryListProps>;
  TaskList: ComponentType<TaskListProps>;
  Panel: ComponentType<PanelProps>;
  // Chrome used by consuming apps (not the engine) — part of the adapter
  // so a consumer never has to import a specific design system directly.
  Header: ComponentType<HeaderProps>;
  Footer: ComponentType<FooterProps>;
  CookieBanner: ComponentType<CookieBannerProps>;
};

/**
 * Class tokens for markup the engine emits itself (headings, captions,
 * body text, links, button groups). Kept as class strings so adapters can
 * map them onto their own utility/BEM classes without new components.
 */
export type DesignSystemTokens = {
  headingXl: string;
  headingL: string;
  headingM: string;
  captionL: string;
  body: string;
  link: string;
  buttonGroup: string;
};

export type DesignSystem = {
  /** Identifier for diagnostics, e.g. "govuk". */
  name: string;
  components: DesignSystemComponents;
  tokens: DesignSystemTokens;
};
