import type { Meta, StoryObj } from '@storybook/react';
import { Field } from './field.js';
import { Label } from './label.js';

const meta: Meta<typeof Field> = {
  title: 'UI/Field',
  component: Field,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {
  render: () => (
    <Field>
      <Label htmlFor="name">Name</Label>
      <input
        id="name"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder="Enter your name"
      />
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field error="This field is required">
      <Label htmlFor="email">Email</Label>
      <input
        id="email"
        type="email"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder="Enter your email"
      />
    </Field>
  ),
};
