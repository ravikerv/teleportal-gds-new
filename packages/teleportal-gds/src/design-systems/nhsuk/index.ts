/**
 * NHS.UK design system adapter — the shipped example proving the product
 * is design-system agnostic. Activate with:
 *
 *   import { configureDesignSystem, nhsukDesignSystem } from 'teleportal-gds';
 *   configureDesignSystem(nhsukDesignSystem);
 *
 * The consuming app must load nhsuk-frontend's CSS itself.
 */

import type { DesignSystem } from '../types';
import {
  NhsBackLink,
  NhsButton,
  NhsCheckbox,
  NhsCookieBanner,
  NhsDatePicker,
  NhsErrorSummary,
  NhsFooter,
  NhsHeader,
  NhsInput,
  NhsPanel,
  NhsRadio,
  NhsSelect,
  NhsSummaryList,
  NhsTaskList,
  NhsTextArea,
} from './components';

export const nhsukDesignSystem: DesignSystem = {
  name: 'nhsuk',
  components: {
    Input: NhsInput,
    Select: NhsSelect,
    Radio: NhsRadio,
    Checkbox: NhsCheckbox,
    DatePicker: NhsDatePicker,
    TextArea: NhsTextArea,
    Button: NhsButton,
    BackLink: NhsBackLink,
    ErrorSummary: NhsErrorSummary,
    SummaryList: NhsSummaryList,
    TaskList: NhsTaskList,
    Panel: NhsPanel,
    Header: NhsHeader,
    Footer: NhsFooter,
    CookieBanner: NhsCookieBanner,
  },
  tokens: {
    headingXl: 'nhsuk-heading-xl',
    headingL: 'nhsuk-heading-l',
    headingM: 'nhsuk-heading-m',
    captionL: 'nhsuk-caption-l',
    body: 'nhsuk-body',
    link: 'nhsuk-link',
    buttonGroup: 'nhsuk-button-group',
  },
};
