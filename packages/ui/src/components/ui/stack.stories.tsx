import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from './stack.js';

const meta: Meta<typeof Stack> = {
  title: 'UI/Stack',
  component: Stack,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Stack>;

export const Vertical: Story = {
  render: () => (
    <Stack gap={4}>
      <div className="bg-primary/10 p-4 rounded-md">Item 1</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 2</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 3</div>
    </Stack>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <Stack direction="row" gap={4}>
      <div className="bg-primary/10 p-4 rounded-md">Item 1</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 2</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 3</div>
    </Stack>
  ),
};

export const Centered: Story = {
  render: () => (
    <Stack align="center" justify="center" gap={4}>
      <div className="bg-primary/10 p-4 rounded-md">Item 1</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 2</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 3</div>
    </Stack>
  ),
};
