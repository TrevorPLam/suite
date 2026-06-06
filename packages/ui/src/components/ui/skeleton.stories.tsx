import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './skeleton.js';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'rectangular', 'circular'],
      description: 'Skeleton variant style',
    },
    height: {
      control: 'text',
      description: 'Custom height (e.g., "100px")',
    },
    width: {
      control: 'text',
      description: 'Custom width (e.g., "200px")',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Text: Story = {
  args: {
    variant: 'text',
  },
};

export const Rectangular: Story = {
  args: {
    variant: 'rectangular',
  },
};

export const Circular: Story = {
  args: {
    variant: 'circular',
  },
};

export const CustomSize: Story = {
  args: {
    variant: 'rectangular',
    height: '100px',
    width: '200px',
  },
};

export const CardSkeleton: Story = {
  render: () => (
    <div className="w-[350px] space-y-4 rounded-lg border border-[--color-border] bg-[--color-card] p-6">
      <Skeleton variant="circular" height="40px" width="40px" />
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
      </div>
      <Skeleton variant="rectangular" height="100px" />
    </div>
  ),
};

export const ListSkeleton: Story = {
  render: () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton variant="circular" height="40px" width="40px" />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" />
            <Skeleton variant="text" width="60%" />
          </div>
        </div>
      ))}
    </div>
  ),
};
