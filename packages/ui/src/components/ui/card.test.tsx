import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card.js';

describe('Card Accessibility', () => {
  it('should have no accessibility violations for complete card', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have accessible heading for card title', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
      </Card>
    );
    const title = screen.getByRole('heading', { name: 'Settings' });
    expect(title).toBeInTheDocument();
  });

  it('should have no accessibility violations with minimal card', async () => {
    const { container } = render(
      <Card>
        <CardContent>Simple content</CardContent>
      </Card>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });
});
