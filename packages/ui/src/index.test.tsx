import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    it('displays button text to user', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('displays input with placeholder text', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('applies error variant styling', () => {
      render(<Input variant="error" />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input.className).toContain('border');
    });
  });

  describe('Dialog', () => {
    it('displays dialog with title when open', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Test</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  describe('Card', () => {
    it('displays card with title, description, content, and footer', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });

  describe('Badge', () => {
    it('displays badge text to user', () => {
      render(<Badge>Test</Badge>);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('applies success variant styling', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('inline-flex');
    });
  });

  describe('Select', () => {
    it('displays select with placeholder when open', () => {
      render(
        <Select open>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      expect(screen.getByText('Select')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });
  });

  describe('Textarea', () => {
    it('displays textarea with placeholder text', () => {
      render(<Textarea placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('applies resize-none variant styling', () => {
      render(<Textarea resize="none" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea.className).toContain('resize-none');
    });
  });

  describe('cn utility', () => {
    it('merges class names into single string', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('excludes falsy conditional classes from output', () => {
      expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3');
    });
  });
});
