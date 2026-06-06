import type { Meta, StoryObj } from '@storybook/react';
import { Container } from './container.js';

const meta: Meta<typeof Container> = {
  title: 'UI/Container',
  component: Container,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Container>;

export const Default: Story = {
  render: () => (
    <div className="bg-muted p-8">
      <Container>
        <div className="bg-background p-4 rounded-md">
          <h2 className="text-lg font-semibold">Container Content</h2>
          <p className="text-sm text-muted-foreground">
            This content is centered with max-width constraints.
          </p>
        </div>
      </Container>
    </div>
  ),
};

export const Small: Story = {
  render: () => (
    <div className="bg-muted p-8">
      <Container maxWidth="sm">
        <div className="bg-background p-4 rounded-md">
          <h2 className="text-lg font-semibold">Small Container</h2>
        </div>
      </Container>
    </div>
  ),
};

export const Large: Story = {
  render: () => (
    <div className="bg-muted p-8">
      <Container maxWidth="xl">
        <div className="bg-background p-4 rounded-md">
          <h2 className="text-lg font-semibold">Large Container</h2>
        </div>
      </Container>
    </div>
  ),
};
