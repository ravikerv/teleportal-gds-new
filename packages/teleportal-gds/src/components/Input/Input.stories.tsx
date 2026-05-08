import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    id: 'first-name',
    label: 'First name',
  },
};

export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const WithHint: Story = {
  args: {
    hint: 'As shown on your passport.',
  },
};

export const WithError: Story = {
  args: {
    error: 'Enter your first name',
  },
};

export const WithHintAndError: Story = {
  args: {
    hint: 'As shown on your passport.',
    error: 'Enter your first name',
  },
};

export const Email: Story = {
  args: {
    id: 'email',
    label: 'Email address',
    inputType: 'email',
    autocomplete: 'email',
  },
};

export const Required: Story = {
  args: {
    required: true,
  },
};
