# @suite/ui

A shared UI component library for the Suite productivity suite, built with React, Tailwind CSS, and Radix UI.

## Features

- **Component Library**: Reusable UI components (Button, Dialog, Input, Select, etc.)
- **Theme System**: Dark/light mode support with design tokens
- **Internationalization (i18n)**: Multi-language support with RTL (right-to-left) layout
- **Accessibility**: WCAG-compliant components with keyboard navigation
- **TypeScript**: Full type safety for all components

## Installation

```bash
pnpm add @suite/ui
```

## Internationalization (i18n)

The UI package includes full i18n support using `react-i18next` with automatic locale detection and RTL layout support.

### Setup

Wrap your application with the `I18nProvider`:

```tsx
import { I18nProvider } from '@suite/ui';

function App() {
  return (
    <I18nProvider locale="en">
      <YourApp />
    </I18nProvider>
  );
}
```

### Using Translations

Use the `useTranslation` hook to access translations:

```tsx
import { useTranslation } from '@suite/ui';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <button>{t('common.save')}</button>
  );
}
```

### Translation Key Structure

Translation keys are organized by component namespace:

```json
{
  "common": {
    "close": "Close",
    "cancel": "Cancel",
    "save": "Save"
  },
  "button": {
    "primary": "Primary action"
  },
  "dialog": {
    "title": "Dialog title",
    "confirm": "Confirm"
  }
}
```

### Adding New Translations

1. Add translation keys to `src/i18n/en.json`:

```json
{
  "myComponent": {
    "title": "My Component",
    "description": "Component description"
  }
}
```

2. Use the translation in your component:

```tsx
const { t } = useTranslation();
const title = t('myComponent.title');
```

### Key Naming Conventions

- Use **kebab-case** for key names: `my-component-title`
- Organize keys by **component namespace**: `button.primary`, `dialog.confirm`
- Use **common namespace** for shared strings: `common.save`, `common.cancel`
- Use **descriptive names** that reflect the context: `user.profile.settings`

### Locale Switching

The `I18nProvider` accepts an optional `locale` prop:

```tsx
<I18nProvider locale="es">
  <App />
</I18nProvider>
```

Locale is automatically detected from:
1. Browser language settings
2. LocalStorage (persists user preference)
3. Fallback to English (`en`)

### RTL (Right-to-Left) Support

The UI package automatically supports RTL languages (Arabic, Hebrew, etc.):

- **Automatic direction detection**: i18next detects language direction
- **CSS logical properties**: Uses `margin-inline-start` instead of `margin-left`
- **Direction-aware layout**: Components automatically flip for RTL

To test RTL support:

```tsx
<I18nProvider locale="ar">
  <App />
</I18nProvider>
```

The HTML `dir` attribute is automatically set to `rtl` or `ltr` based on the language.

### Adding New Languages

1. Create a new translation file: `src/i18n/es.json`
2. Add translation keys following the same structure as `en.json`
3. Import and add to resources in `src/i18n/config.ts`:

```ts
import es from './es.json';

export const resources = {
  en: { translation: en },
  es: { translation: es },
};
```

### CSS for RTL

Use CSS logical properties for automatic RTL/LTR adaptation:

```css
/* Use logical properties */
.my-component {
  margin-inline-start: 1rem;  /* Flips based on direction */
  padding-inline-end: 0.5rem; /* Flips based on direction */
}

/* Avoid physical properties */
.my-component {
  margin-left: 1rem;  /* Won't flip for RTL */
  padding-right: 0.5rem; /* Won't flip for RTL */
}
```

For RTL-specific overrides, use the `[dir="rtl"]` selector:

```css
[dir="rtl"] .my-component {
  /* RTL-specific styles */
}
```

## Components

### Button

```tsx
import { Button } from '@suite/ui';

<Button variant="primary">Click me</Button>
```

### Dialog

```tsx
import { Dialog } from '@suite/ui';

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogTitle>Dialog Title</DialogTitle>
    <DialogDescription>Description</DialogDescription>
  </DialogContent>
</Dialog>
```

### Input

```tsx
import { Input } from '@suite/ui';

<Input placeholder="Enter value" />
```

### Select

```tsx
import { Select } from '@suite/ui';

<Select>
  <SelectTrigger>Choose option</SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
    <SelectItem value="2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

## Theme System

The UI package includes a theme system with dark/light mode support:

```tsx
import { ThemeProvider, useTheme } from '@suite/ui';

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}

function MyComponent() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme('dark')}>Dark Mode</button>;
}
```

## Styling

Components use Tailwind CSS with design tokens from `@suite/design-tokens`:

```tsx
import { cn } from '@suite/ui';

<div className={cn('base-class', 'conditional-class')} />
```

## Accessibility Testing

The UI package uses `vitest-axe` (axe-core integration for Vitest) to ensure all components meet WCAG accessibility standards.

### Running Accessibility Tests

Accessibility tests are included in the standard test suite:

```bash
pnpm test
```

### Writing Accessibility Tests

When adding new components, include accessibility tests using the `toHaveNoViolations` matcher:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MyComponent } from './my-component';

describe('MyComponent Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<MyComponent />);
    const results = await axe(container);
    // @ts-expect-error - vitest-axe types not fully recognized in test files
    expect(results).toHaveNoViolations();
  });
});
```

### Testing Guidelines

- **Test all component variants**: Each variant (primary, secondary, error, etc.) should be tested
- **Test interactive states**: Test disabled, focused, and error states
- **Test with proper labels**: Form elements must have labels (via `aria-label`, `placeholder`, or `<label>`)
- **Test keyboard navigation**: Ensure interactive elements are keyboard accessible
- **Test ARIA attributes**: Verify proper ARIA roles and attributes are present

### Common Accessibility Violations

- **Missing labels**: Form elements without `aria-label`, `placeholder`, or associated `<label>`
- **Missing alt text**: Images without descriptive `alt` attributes
- **Color contrast**: Text and background colors that don't meet WCAG AA standards
- **Keyboard traps**: Components that trap keyboard focus
- **Missing ARIA roles**: Custom interactive elements without proper ARIA roles

### Mocking for jsdom

Some Radix UI components require mocking for jsdom compatibility. The test setup includes:

```ts
// vitest.setup.ts
Element.prototype.scrollIntoView = vi.fn();
```

This is automatically configured in `vitest.setup.ts`.

## Development

```bash
# Install dependencies
pnpm install

# Run typecheck
pnpm typecheck

# Run tests
pnpm test

# Run lint
pnpm lint

# Build
pnpm build

# Run Storybook
pnpm storybook
```

## License

MIT
