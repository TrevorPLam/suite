import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label.js';

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  render: () => <Label>Default Label</Label>,
};

export const Muted: Story = {
  render: () => <Label variant="muted">Muted Label</Label>,
};

export const WithInput: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <input
        id="email"
        type="email"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder="Email"
      />
    </div>
  ),
};
