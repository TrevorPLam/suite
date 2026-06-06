import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './progress.js';

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Zero: Story = {
  render: () => <Progress value={0} />,
};

export const Partial: Story = {
  render: () => <Progress value={50} />,
};

export const Complete: Story = {
  render: () => <Progress value={100} />,
};
