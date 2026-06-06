import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as React from 'react';
import {
  Button,
  Input,
  Dialog,
  DialogTrigger as _DialogTrigger,
  DialogContent,
  DialogTitle,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  cn,
} from './index.js';

describe('UI Components', () => {
  describe('Button', () => {
    it('renders button', () => {
      const { container } = render(<Button>Click me</Button>);
      expect(container.querySelector('button')).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('renders input', () => {
      const { container } = render(<Input placeholder="Enter text" />);
      expect(container.querySelector('input')).toBeInTheDocument();
    });

    it('applies variant classes', () => {
      const { container } = render(<Input variant="error" />);
      const input = container.querySelector('input');
      expect(input).toBeInTheDocument();
      expect(input?.className).toContain('border');
    });
  });

  describe('Dialog', () => {
    it('renders dialog components', () => {
      const { container } = render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Card', () => {
    it('renders card with subcomponents', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );
      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });

  describe('Badge', () => {
    it('renders badge', () => {
      const { container } = render(<Badge>Test</Badge>);
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('applies variant classes', () => {
      const { container } = render(<Badge variant="success">Success</Badge>);
      const badge = container.querySelector('div');
      expect(badge).toBeInTheDocument();
      expect(badge?.className).toContain('inline-flex');
    });
  });

  describe('Select', () => {
    it('renders select components', () => {
      const { container } = render(
        <Select open>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeTruthy();
    });
  });

  describe('Textarea', () => {
    it('renders textarea', () => {
      const { container } = render(<Textarea placeholder="Enter text" />);
      expect(container.querySelector('textarea')).toBeInTheDocument();
    });

    it('applies resize variant', () => {
      const { container } = render(<Textarea resize="none" />);
      const textarea = container.querySelector('textarea');
      expect(textarea).toBeInTheDocument();
      expect(textarea?.className).toContain('resize-none');
    });
  });

  describe('cn utility', () => {
    it('merges class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('handles conditional classes', () => {
      expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3');
    });
  });
});
