import type { Meta, StoryObj } from '@storybook/react';
import { Grid } from './grid.js';

const meta: Meta<typeof Grid> = {
  title: 'UI/Grid',
  component: Grid,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Grid>;

export const Default: Story = {
  render: () => (
    <Grid cols={3} gap={4}>
      <div className="bg-primary/10 p-4 rounded-md">Item 1</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 2</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 3</div>
    </Grid>
  ),
};

export const TwoColumns: Story = {
  render: () => (
    <Grid cols={2} gap={6}>
      <div className="bg-primary/10 p-4 rounded-md">Item 1</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 2</div>
    </Grid>
  ),
};

export const FourColumns: Story = {
  render: () => (
    <Grid cols={4} gap={2}>
      <div className="bg-primary/10 p-4 rounded-md">Item 1</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 2</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 3</div>
      <div className="bg-primary/10 p-4 rounded-md">Item 4</div>
    </Grid>
  ),
};
