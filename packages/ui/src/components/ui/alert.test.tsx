import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from './alert.js';
import { axe } from 'vitest-axe';

describe('Alert', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Alert>
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test Description</AlertDescription>
      </Alert>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe matcher types not fully recognized
    expect(results).toHaveNoViolations();
  });

  it('should render with destructive variant', async () => {
    const { container } = render(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong</AlertDescription>
      </Alert>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe matcher types not fully recognized
    expect(results).toHaveNoViolations();
  });

  it('should render with warning variant', async () => {
    const { container } = render(
      <Alert variant="warning">
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Be careful</AlertDescription>
      </Alert>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe matcher types not fully recognized
    expect(results).toHaveNoViolations();
  });

  it('should render with success variant', async () => {
    const { container } = render(
      <Alert variant="success">
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>It worked</AlertDescription>
      </Alert>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe matcher types not fully recognized
    expect(results).toHaveNoViolations();
  });

  it('should have role="alert"', () => {
    render(
      <Alert>
        <AlertTitle>Test</AlertTitle>
        <AlertDescription>Description</AlertDescription>
      </Alert>
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });
});
