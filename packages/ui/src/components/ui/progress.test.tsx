import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from './progress.js';
import { axe } from 'vitest-axe';

describe('Progress', () => {
  it('should have no accessibility violations when used with aria-label', async () => {
    const { container } = render(<Progress value={50} aria-label="Loading progress" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe matcher types not fully recognized
    expect(results).toHaveNoViolations();
  });

  it('should render with value', () => {
    render(<Progress value={50} />);
    const progress = screen.getByRole('progressbar');
    expect(progress).toBeInTheDocument();
  });

  it('should render with 0 value', () => {
    render(<Progress value={0} />);
    const progress = screen.getByRole('progressbar');
    expect(progress).toBeInTheDocument();
  });

  it('should render with 100 value', () => {
    render(<Progress value={100} />);
    const progress = screen.getByRole('progressbar');
    expect(progress).toBeInTheDocument();
  });
});
