import type { Meta, StoryObj } from '@storybook/react-vite';

import { Radio } from './Radio';

const meta: Meta<typeof Radio> = {
  title: 'Components/Radio',
  component: Radio,
  tags: ['autodocs'],
  args: {
    id: 'changed-name',
    label: 'Have you changed your name?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
};
export default meta;

type Story = StoryObj<typeof Radio>;

export const Default: Story = {};

export const WithHint: Story = {
  args: { hint: 'This includes changing your last name or spelling.' },
};

export const WithItemHints: Story = {
  args: {
    options: [
      { value: 'email', label: 'Email', hint: 'We can reach you the same day.' },
      { value: 'post', label: 'Post', hint: 'Allow up to 5 working days.' },
    ],
  },
};

export const WithError: Story = {
  args: { error: 'Select if you have changed your name' },
};
