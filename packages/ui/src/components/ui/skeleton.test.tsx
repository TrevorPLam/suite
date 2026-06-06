import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Skeleton } from './skeleton.js';

describe('Skeleton Accessibility', () => {
  it('should have no accessibility violations for text variant', async () => {
    const { container } = render(<Skeleton variant="text" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for rectangular variant', async () => {
    const { container } = render(<Skeleton variant="rectangular" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for circular variant', async () => {
    const { container } = render(<Skeleton variant="circular" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA attributes for loading state', () => {
    render(<Skeleton />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading');
  });

  it('should have no accessibility violations with custom dimensions', async () => {
    const { container } = render(<Skeleton height="100px" width="200px" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });
});
