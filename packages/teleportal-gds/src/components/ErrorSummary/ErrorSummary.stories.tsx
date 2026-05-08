import type { Meta, StoryObj } from '@storybook/react-vite';

import { ErrorSummary } from './ErrorSummary';

const meta: Meta<typeof ErrorSummary> = {
  title: 'Components/ErrorSummary',
  component: ErrorSummary,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ErrorSummary>;

export const Default: Story = {
  args: {
    errors: [
      { fieldId: 'first-name', message: 'Enter your first name' },
      { fieldId: 'dob', message: 'Date of birth must be in the past' },
    ],
  },
};

export const CustomTitle: Story = {
  args: {
    title: "We can't process this application",
    errors: [{ fieldId: 'reference', message: 'Reference number is invalid' }],
  },
};

export const Empty: Story = {
  args: { errors: [] },
};
