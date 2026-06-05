# Accessibility Patterns for React Components

## Common Accessibility Patterns

### 1. Button Components

```tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled,
  variant = 'primary',
  ...ariaProps
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg transition-all duration-150 ease-out
        ${
          variant === 'primary'
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      aria-disabled={disabled}
      {...ariaProps}
    >
      {children}
    </motion.button>
  );
};
```

### 2. Modal Components

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <motion.div
        ref={modalRef}
        className="relative backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 max-w-md w-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <h2 id="modal-title" className="text-xl font-semibold text-white mb-4">
          {title}
        </h2>

        <div className="text-gray-300 mb-6">{children}</div>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
};
```

### 3. Form Components

```tsx
interface FormFieldProps {
  label: string;
  id: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  description?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  error,
  required,
  children,
  description,
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {description && (
        <p id={`${id}-description`} className="text-sm text-gray-400">
          {description}
        </p>
      )}

      {children}

      {error && (
        <p id={`${id}-error`} className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

### 4. Loading States

```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label = 'Loading...',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex items-center space-x-2">
      <motion.div
        className={`${sizeClasses[size]} border-2 border-blue-500 border-t-transparent rounded-full`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
        aria-hidden="true"
      />
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
  );
};
```

### 5. Keyboard Navigation Patterns

```tsx
interface KeyboardNavigationProps {
  children: React.ReactNode;
  className?: string;
}

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({ children, className }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};
```

## ARIA Best Practices

### Landmarks

- Use semantic HTML5 elements: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`
- Add `role` attributes when necessary for clarity
- Use `aria-label` or `aria-labelledby` for landmark identification

### Screen Reader Announcements

```tsx
// For dynamic content updates
const [status, setStatus] = React.useState('');

// Announce status changes
React.useEffect(() => {
  if (status) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = status;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}, [status]);
```

### Focus Management

- Trap focus within modals and overlays
- Restore focus to previous element when closing
- Use `skip-link` for keyboard navigation
- Ensure visible focus indicators (electric blue theme)

## Testing Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Screen reader reads content correctly
- [ ] ARIA labels are descriptive
- [ ] Color contrast meets 4.5:1 ratio
- [ ] Forms have proper labels and error handling
- [ ] Modals trap focus appropriately
- [ ] Dynamic content updates are announced
