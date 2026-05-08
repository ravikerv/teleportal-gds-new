import type { Meta, StoryObj } from '@storybook/react-vite';

import { SummaryList } from './SummaryList';

const meta: Meta<typeof SummaryList> = {
  title: 'Components/SummaryList',
  component: SummaryList,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof SummaryList>;

export const Default: Story = {
  args: {
    rows: [
      { key: 'Name', value: 'Sarah Philips' },
      { key: 'Date of birth', value: '5 January 1978' },
      { key: 'Address', value: '72 Guild Street, London, SE23 6FH' },
    ],
  },
};

export const WithChangeLinks: Story = {
  args: {
    rows: [
      {
        key: 'Name',
        value: 'Sarah Philips',
        action: { href: '/name', text: 'Change' },
      },
      {
        key: 'Date of birth',
        value: '5 January 1978',
        action: { href: '/dob', text: 'Change' },
      },
    ],
  },
};
