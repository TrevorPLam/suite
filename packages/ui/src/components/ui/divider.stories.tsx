import type { Meta, StoryObj } from '@storybook/react';
import { Divider } from './divider.js';

const meta: Meta<typeof Divider> = {
  title: 'UI/Divider',
  component: Divider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-64">
      <p>Content above</p>
      <Divider />
      <p>Content below</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-32 items-center">
      <p>Left content</p>
      <Divider orientation="vertical" />
      <p>Right content</p>
    </div>
  ),
};
