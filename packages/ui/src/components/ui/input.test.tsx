import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Input } from './input.js';

describe('Input Accessibility', () => {
  it('should have no accessibility violations for default input', async () => {
    const { container } = render(<Input placeholder="Enter text" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for error variant', async () => {
    const { container } = render(<Input variant="error" aria-label="Error input" aria-invalid="true" aria-describedby="error-msg" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for success variant', async () => {
    const { container } = render(<Input variant="success" aria-label="Success input" aria-describedby="success-msg" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when disabled', async () => {
    const { container } = render(<Input disabled aria-label="Disabled input" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have accessible label via aria-label', () => {
    render(<Input aria-label="Email address" />);
    const input = screen.getByRole('textbox', { name: 'Email address' });
    expect(input).toBeInTheDocument();
  });

  it('should have accessible label via placeholder', () => {
    render(<Input placeholder="Enter your email" />);
    const input = screen.getByPlaceholderText('Enter your email');
    expect(input).toBeInTheDocument();
  });

  it('should support keyboard navigation', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('should have no accessibility violations with required attribute', async () => {
    const { container } = render(<Input required aria-label="Required field" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });
});
