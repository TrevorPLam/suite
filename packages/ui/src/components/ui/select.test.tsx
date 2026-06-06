import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select.js';

describe('Select Accessibility', () => {
  it('should have no accessibility violations when open', async () => {
    const { container } = render(
      <Select open>
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
          <SelectItem value="2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have accessible trigger button', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
      </Select>
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeInTheDocument();
  });

  it('should have accessible placeholder text', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
      </Select>
    );
    const placeholder = screen.getByText('Select an option');
    expect(placeholder).toBeInTheDocument();
  });

  it('should have no accessibility violations with multiple items', async () => {
    const { container } = render(
      <Select open>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">First</SelectItem>
          <SelectItem value="2">Second</SelectItem>
          <SelectItem value="3">Third</SelectItem>
        </SelectContent>
      </Select>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });
});
