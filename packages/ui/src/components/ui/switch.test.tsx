import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Switch } from './switch.js';
import { axe } from 'vitest-axe';

describe('Switch', () => {
  it('should have no accessibility violations when used with label', async () => {
    const { container } = render(
      <div className="flex items-center space-x-2">
        <Switch id="test-switch" />
        <label htmlFor="test-switch">Enable notifications</label>
      </div>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe matcher types not fully recognized
    expect(results).toHaveNoViolations();
  });

  it('should have button role', () => {
    render(<Switch />);
    const button = screen.getByRole('switch');
    expect(button).toBeInTheDocument();
  });

  it('should be checked when defaultChecked is true', () => {
    render(<Switch defaultChecked />);
    const button = screen.getByRole('switch');
    expect(button).toBeChecked();
  });

  it('should be disabled when disabled is true', () => {
    render(<Switch disabled />);
    const button = screen.getByRole('switch');
    expect(button).toBeDisabled();
  });
});
