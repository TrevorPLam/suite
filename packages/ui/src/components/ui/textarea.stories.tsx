import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea.js';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'error', 'success'],
      description: 'Textarea variant style',
    },
    resize: {
      control: 'select',
      options: ['none', 'vertical', 'horizontal', 'both'],
      description: 'Textarea resize behavior',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the textarea',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    variant: 'default',
    placeholder: 'Enter your message...',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    placeholder: 'Enter your message...',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    placeholder: 'Enter your message...',
  },
};

export const NoResize: Story = {
  args: {
    variant: 'default',
    resize: 'none',
    placeholder: 'Fixed size textarea',
  },
};

export const HorizontalResize: Story = {
  args: {
    variant: 'default',
    resize: 'horizontal',
    placeholder: 'Horizontal resize only',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'default',
    placeholder: 'Disabled textarea',
    disabled: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Textarea variant="default" placeholder="Default textarea" />
      <Textarea variant="error" placeholder="Error textarea" />
      <Textarea variant="success" placeholder="Success textarea" />
    </div>
  ),
};
