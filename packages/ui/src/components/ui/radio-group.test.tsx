import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadioGroup, RadioGroupItem } from './radio-group.js';
import { axe } from 'vitest-axe';

describe('RadioGroup', () => {
  it('should have no accessibility violations when used with labels', async () => {
    const { container } = render(
      <RadioGroup defaultValue="option-one">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option-one" id="option-one" />
          <label htmlFor="option-one">Option One</label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option-two" id="option-two" />
          <label htmlFor="option-two">Option Two</label>
        </div>
      </RadioGroup>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe matcher types not fully recognized
    expect(results).toHaveNoViolations();
  });

  it('should have radio role for items', () => {
    render(
      <RadioGroup defaultValue="option-one">
        <RadioGroupItem value="option-one" id="option-one" />
        <RadioGroupItem value="option-two" id="option-two" />
      </RadioGroup>
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
  });

  it('should check the default value', () => {
    render(
      <RadioGroup defaultValue="option-one">
        <RadioGroupItem value="option-one" id="option-one" />
        <RadioGroupItem value="option-two" id="option-two" />
      </RadioGroup>
    );
    const checkedRadio = screen.getByRole('radio', { checked: true });
    expect(checkedRadio).toHaveAttribute('value', 'option-one');
  });
});
