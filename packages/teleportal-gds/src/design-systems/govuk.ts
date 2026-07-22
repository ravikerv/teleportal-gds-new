/**
 * The built-in GOV.UK design system — the library's default adapter,
 * assembled from the existing wrapper components. Consumers on GOV.UK
 * need to do nothing; other design systems replace this via
 * `configureDesignSystem`.
 */

import { BackLink } from '../components/BackLink';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { CookieBanner } from '../components/CookieBanner';
import { DatePicker } from '../components/DatePicker';
import { ErrorSummary } from '../components/ErrorSummary';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { Panel } from '../components/Panel';
import { Radio } from '../components/Radio';
import { Select } from '../components/Select';
import { SummaryList } from '../components/SummaryList';
import { TaskList } from '../components/TaskList';
import { TextArea } from '../components/TextArea';
import type { DesignSystem } from './types';

export const govukDesignSystem: DesignSystem = {
  name: 'govuk',
  components: {
    Input,
    Select,
    Radio,
    Checkbox,
    DatePicker,
    TextArea,
    Button,
    BackLink,
    ErrorSummary,
    SummaryList,
    TaskList,
    Panel,
    Header,
    Footer,
    CookieBanner,
  },
  tokens: {
    headingXl: 'govuk-heading-xl',
    headingL: 'govuk-heading-l',
    headingM: 'govuk-heading-m',
    captionL: 'govuk-caption-l',
    body: 'govuk-body',
    link: 'govuk-link',
    buttonGroup: 'govuk-button-group',
  },
};
