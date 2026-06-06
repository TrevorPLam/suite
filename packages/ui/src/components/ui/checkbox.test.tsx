import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Checkbox } from './checkbox.js';
import { axe } from 'vitest-axe';

describe('Checkbox', () => {
  it('should have no accessibility violations when used with label', async () => {
    const { container } = render(
      <div className="flex items-center space-x-2">
        <Checkbox id="test-checkbox" />
        <label htmlFor="test-checkbox">Accept terms</label>
      </div>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe matcher types not fully recognized
    expect(results).toHaveNoViolations();
  });

  it('should have checkbox role', () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('should be checked when defaultChecked is true', () => {
    render(<Checkbox defaultChecked />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should be disabled when disabled is true', () => {
    render(<Checkbox disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });
});
