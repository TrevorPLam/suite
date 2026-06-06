import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './label.js';
import { axe } from 'vitest-axe';

describe('Label', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<Label>Test Label</Label>);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe matcher types not fully recognized
    expect(results).toHaveNoViolations();
  });

  it('should render with default variant', () => {
    render(<Label>Test Label</Label>);
    const label = screen.getByText('Test Label');
    expect(label).toBeInTheDocument();
  });

  it('should render with muted variant', () => {
    render(<Label variant="muted">Muted Label</Label>);
    const label = screen.getByText('Muted Label');
    expect(label).toBeInTheDocument();
  });

  it('should associate with input when htmlFor is provided', () => {
    render(
      <div>
        <Label htmlFor="test-input">Test Label</Label>
        <input id="test-input" />
      </div>
    );
    const label = screen.getByText('Test Label');
    const input = screen.getByRole('textbox');
    expect(label).toHaveAttribute('for', 'test-input');
    expect(input).toHaveAttribute('id', 'test-input');
  });
});
