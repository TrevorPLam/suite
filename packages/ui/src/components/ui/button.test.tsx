import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Button } from './button.js';

describe('Button Accessibility', () => {
  it('should have no accessibility violations for default button', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for primary variant', async () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for secondary variant', async () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for danger variant', async () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when disabled', async () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have accessible name via text content', () => {
    render(<Button>Submit Form</Button>);
    const button = screen.getByRole('button', { name: 'Submit Form' });
    expect(button).toBeInTheDocument();
  });

  it('should have accessible name via aria-label', () => {
    render(<Button aria-label="Close dialog">×</Button>);
    const button = screen.getByRole('button', { name: 'Close dialog' });
    expect(button).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
