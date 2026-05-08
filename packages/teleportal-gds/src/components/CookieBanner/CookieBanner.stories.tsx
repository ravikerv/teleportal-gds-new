import type { Meta, StoryObj } from '@storybook/react-vite';

import { CookieBanner } from './CookieBanner';

const noop = async (_formData: FormData): Promise<void> => {
  /* Storybook stub — the real Server Actions live in the library. */
};

const meta: Meta<typeof CookieBanner> = {
  title: 'Components/CookieBanner',
  component: CookieBanner,
  tags: ['autodocs'],
  args: {
    serviceName: 'TelePortal Sample',
    acceptAction: noop,
    rejectAction: noop,
  },
};
export default meta;

type Story = StoryObj<typeof CookieBanner>;

export const Default: Story = {};

export const WithViewCookies: Story = {
  args: { viewCookiesHref: '/cookies' },
};
