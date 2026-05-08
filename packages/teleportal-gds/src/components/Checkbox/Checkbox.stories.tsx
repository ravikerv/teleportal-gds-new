import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: {
    id: 'waste',
    label: 'Which types of waste do you transport?',
    options: [
      { value: 'animal', label: 'Waste from animal carcasses' },
      { value: 'mines', label: 'Waste from mines or quarries' },
      { value: 'farm', label: 'Farm or agricultural waste' },
    ],
  },
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const PreChecked: Story = {
  args: { defaultValues: ['animal', 'farm'] },
};

export const WithError: Story = {
  args: { error: 'Select all the types of waste you transport' },
};
