import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Save and continue',
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Cancel' },
};

export const Warning: Story = {
  args: { variant: 'warning', children: 'Delete account' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const AsLink: Story = {
  args: { href: '#', children: 'Start now' },
};
