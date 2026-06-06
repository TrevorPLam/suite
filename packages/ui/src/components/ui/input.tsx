import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const inputVariants = cva(
  'flex h-10 w-full rounded-md border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm ring-offset-[--color-background] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[--color-muted-foreground] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-[--color-border]',
        error: 'border-[--color-destructive] focus-visible:ring-[--color-destructive]',
        success: 'border-[--color-success] focus-visible:ring-[--color-success]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
