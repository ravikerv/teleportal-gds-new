import type { Meta, StoryObj } from '@storybook/react-vite';

import { BackLink } from './BackLink';

const meta: Meta<typeof BackLink> = {
  title: 'Components/BackLink',
  component: BackLink,
  tags: ['autodocs'],
  args: { href: '#' },
};
export default meta;

type Story = StoryObj<typeof BackLink>;

export const Default: Story = {};

export const CustomLabel: Story = {
  args: { children: 'Back to your details' },
};

export const Inverse: Story = {
  args: { inverse: true },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
