import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Badge } from './badge.js';

describe('Badge Accessibility', () => {
  it('should have no accessibility violations for default badge', async () => {
    const { container } = render(<Badge>New</Badge>);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for success variant', async () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for error variant', async () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for warning variant', async () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for outline variant', async () => {
    const { container } = render(<Badge variant="outline">Label</Badge>);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should be readable by screen readers', () => {
    render(<Badge>Important</Badge>);
    const badge = screen.getByText('Important');
    expect(badge).toBeInTheDocument();
  });
});
