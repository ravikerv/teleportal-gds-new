import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextArea } from './TextArea';

const meta: Meta<typeof TextArea> = {
  title: 'Components/TextArea',
  component: TextArea,
  tags: ['autodocs'],
  args: {
    id: 'more-detail',
    label: 'Can you provide more detail?',
  },
};
export default meta;

type Story = StoryObj<typeof TextArea>;

export const Default: Story = {};

export const WithHint: Story = {
  args: { hint: 'Do not include personal or financial information.' },
};

export const WithError: Story = {
  args: { error: 'Enter more detail' },
};
