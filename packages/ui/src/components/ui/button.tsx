import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function Button({ children, className = '', ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md bg-[--color-primary] px-4 py-2 text-sm font-medium text-[--color-primary-foreground] transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[--color-primary] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
