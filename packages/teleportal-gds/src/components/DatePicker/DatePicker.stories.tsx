import type { Meta, StoryObj } from '@storybook/react-vite';

import { DatePicker } from './DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'Components/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  args: {
    id: 'passport-issued',
    label: 'When was your passport issued?',
    hint: 'For example, 27 3 2007',
  },
};
export default meta;

type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {};

export const PreFilled: Story = {
  args: { defaultValue: '2007-03-27' },
};

export const WithError: Story = {
  args: { error: 'The date your passport was issued must be in the past' },
};
