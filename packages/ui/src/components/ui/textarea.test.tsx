import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Textarea } from './textarea.js';

describe('Textarea Accessibility', () => {
  it('should have no accessibility violations for default textarea', async () => {
    const { container } = render(<Textarea placeholder="Enter text" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for error variant', async () => {
    const { container } = render(<Textarea variant="error" aria-label="Error textarea" aria-invalid="true" aria-describedby="error-msg" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for success variant', async () => {
    const { container } = render(<Textarea variant="success" aria-label="Success textarea" aria-describedby="success-msg" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when disabled', async () => {
    const { container } = render(<Textarea disabled aria-label="Disabled textarea" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have accessible label via aria-label', () => {
    render(<Textarea aria-label="Your message" />);
    const textarea = screen.getByRole('textbox', { name: 'Your message' });
    expect(textarea).toBeInTheDocument();
  });

  it('should have accessible label via placeholder', () => {
    render(<Textarea placeholder="Type your message here" />);
    const textarea = screen.getByPlaceholderText('Type your message here');
    expect(textarea).toBeInTheDocument();
  });

  it('should have no accessibility violations with resize-none', async () => {
    const { container } = render(<Textarea resize="none" aria-label="Textarea" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with required attribute', async () => {
    const { container } = render(<Textarea required aria-label="Required field" />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });
});
