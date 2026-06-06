import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-md border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm ring-offset-[--color-background] placeholder:text-[--color-muted-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      resize: {
        none: 'resize-none',
        vertical: 'resize-y',
        horizontal: 'resize-x',
        both: 'resize',
      },
      variant: {
        default: 'border-[--color-border]',
        error: 'border-[--color-destructive] focus-visible:ring-[--color-destructive]',
        success: 'border-[--color-success] focus-visible:ring-[--color-success]',
      },
    },
    defaultVariants: {
      resize: 'vertical',
      variant: 'default',
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, resize, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant, resize }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
