import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[--color-primary] text-[--color-primary-foreground] hover:opacity-90 focus:ring-[--color-primary]',
        secondary: 'bg-[--color-secondary] text-[--color-secondary-foreground] hover:opacity-90 focus:ring-[--color-secondary]',
        danger: 'bg-[--color-destructive] text-[--color-destructive-foreground] hover:opacity-90 focus:ring-[--color-destructive]',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
