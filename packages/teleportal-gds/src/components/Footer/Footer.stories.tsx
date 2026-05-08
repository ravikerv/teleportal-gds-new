import type { Meta, StoryObj } from '@storybook/react-vite';

import { Footer } from './Footer';

const meta: Meta<typeof Footer> = {
  title: 'Components/Footer',
  component: Footer,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Footer>;

export const Default: Story = {};

export const WithLinks: Story = {
  args: {
    links: [
      { label: 'Help', href: '/help' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Cookies', href: '/cookies' },
      { label: 'Accessibility statement', href: '/accessibility' },
      { label: 'Contact', href: '/contact' },
    ],
  },
};
