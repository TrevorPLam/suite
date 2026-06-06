import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from './dialog.js';

describe('Dialog Accessibility', () => {
  it('should have no accessibility violations when open', async () => {
    const { container } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog description</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });

  it('should have accessible dialog title', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Settings</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const title = screen.getByRole('heading', { name: 'Settings' });
    expect(title).toBeInTheDocument();
  });

  it('should have accessible dialog description', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your preferences</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    const description = screen.getByText('Configure your preferences');
    expect(description).toBeInTheDocument();
  });

  it('should have accessible close button', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const closeButton = screen.getByRole('button', { name: 'Close' });
    expect(closeButton).toBeInTheDocument();
  });

  it('should have proper ARIA attributes for dialog role', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });

  it('should have no accessibility violations with trigger button', async () => {
    const { container } = render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open Dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });
});
