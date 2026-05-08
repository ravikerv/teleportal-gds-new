import type { Meta, StoryObj } from '@storybook/react-vite';

import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  args: {
    id: 'sort',
    label: 'Sort by',
    options: [
      { value: 'recent', label: 'Recently published' },
      { value: 'updated', label: 'Recently updated' },
      { value: 'comments', label: 'Most comments' },
    ],
  },
};
export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {};

export const WithPlaceholder: Story = {
  args: { placeholder: 'Choose an option' },
};

export const WithError: Story = {
  args: { error: 'Choose how you want to sort' },
};
