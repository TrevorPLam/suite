import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const skeletonVariants = cva(
  'animate-pulse rounded-md bg-[--color-muted]',
  {
    variants: {
      variant: {
        text: 'h-4 w-full',
        rectangular: 'h-12 w-full',
        circular: 'h-12 w-12 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'text',
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  height?: string;
  width?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, height, width, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant }), className)}
        style={{ height, width, ...style }}
        role="status"
        aria-label="Loading"
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';

export { Skeleton, skeletonVariants };
