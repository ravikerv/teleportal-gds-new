import type { Meta, StoryObj } from '@storybook/react-vite';

import { Header } from './Header';

const meta: Meta<typeof Header> = {
  title: 'Components/Header',
  component: Header,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Header>;

export const Default: Story = {};

export const WithServiceName: Story = {
  args: { serviceName: 'TelePortal Sample' },
};

export const WithNavigation: Story = {
  args: {
    serviceName: 'TelePortal Sample',
    navigation: [
      { label: 'Applications', href: '/', active: true },
      { label: 'Help', href: '/help' },
      { label: 'Sign out', href: '/sign-out' },
    ],
  },
};
