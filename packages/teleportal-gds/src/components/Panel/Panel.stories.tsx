import type { Meta, StoryObj } from '@storybook/react-vite';

import { Panel } from './Panel';

const meta: Meta<typeof Panel> = {
  title: 'Components/Panel',
  component: Panel,
  tags: ['autodocs'],
  args: { title: 'Application complete' },
};
export default meta;

type Story = StoryObj<typeof Panel>;

export const Default: Story = {};

export const WithReference: Story = {
  render: (args) => (
    <Panel {...args}>
      Your reference number
      <br />
      <strong>HDJ2123F</strong>
    </Panel>
  ),
};
