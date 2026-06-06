import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input.js';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'error', 'success'],
      description: 'Input variant style',
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number'],
      description: 'Input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the input',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    variant: 'default',
    type: 'text',
    placeholder: 'Enter text...',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    type: 'text',
    placeholder: 'Enter text...',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    type: 'text',
    placeholder: 'Enter text...',
  },
};

export const Email: Story = {
  args: {
    variant: 'default',
    type: 'email',
    placeholder: 'Enter email...',
  },
};

export const Password: Story = {
  args: {
    variant: 'default',
    type: 'password',
    placeholder: 'Enter password...',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'default',
    type: 'text',
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input variant="default" placeholder="Default input" />
      <Input variant="error" placeholder="Error input" />
      <Input variant="success" placeholder="Success input" />
    </div>
  ),
};
