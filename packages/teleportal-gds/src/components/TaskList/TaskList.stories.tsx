import type { Meta, StoryObj } from '@storybook/react-vite';

import { TaskList } from './TaskList';

const meta: Meta<typeof TaskList> = {
  title: 'Components/TaskList',
  component: TaskList,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof TaskList>;

export const Default: Story = {
  args: {
    tasks: [
      {
        id: 'personal-details',
        label: 'Your details',
        status: 'completed',
        href: '/applications/abc/journeys/personal-details',
      },
      {
        id: 'address',
        label: 'Your address',
        status: 'in-progress',
        href: '/applications/abc/journeys/address',
      },
      {
        id: 'employment',
        label: 'Employment',
        status: 'not-started',
        href: '/applications/abc/journeys/employment',
      },
      {
        id: 'declaration',
        label: 'Declaration',
        hint: 'Available once all other tasks are complete',
        status: 'cannot-start',
      },
    ],
  },
};
