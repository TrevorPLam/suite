import * as React from 'react';
import { cn } from '../../lib/utils.js';

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  error?: string;
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {children}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);
Field.displayName = 'Field';

export { Field };
