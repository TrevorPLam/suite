---
name: create-react-component
description: Guides the creation of React components for Suite apps and shared UI using TypeScript, Tailwind CSS v4, shadcn/ui, accessibility rules, and Suite-specific layout conventions
---

## Suite Component Creation Checklist

1. **Determine component location** based on ownership:

   **App web surfaces (`apps/<app>/web`)**:
   - Feature components: `src/components/`
   - Route/page components: `src/pages/` or `src/routes/` depending on the app structure
   - App-local UI wrappers: `src/components/ui/`

   **Shared UI (`packages/ui`)**:
   - Reusable primitives and cross-app building blocks
   - Keep these generic, typed, and free of app-specific state

   **Domain packages (`packages/domain-*`)**:
   - Do not create React components here unless a package already owns a web-facing helper

2. **Use shadcn/ui components as base** when available (Tailwind v4)
   - Use the shared design tokens and CSS variables from the workspace
   - Keep styling consistent with the Suite visual identity
   - Prefer composition over copying large component patterns

3. **Apply visual identity**:
   - Dark, high-contrast surfaces
   - Electric blue accent for focus, active, and primary actions
   - Rounded surfaces and restrained glass effects only where the design calls for them

4. **Add 150ms ease-out transitions** on interactive elements

5. **Implement accessibility (WCAG 2.2 AA)**:
   - Semantic HTML elements (nav, main, aside, header, footer)
   - ARIA landmarks and labels where needed
   - Keyboard navigation support
   - Focus management (focus trap in modals, focus restoration)
   - 4.5:1 color contrast ratio minimum
   - Proper heading hierarchy (no skipped levels)
   - aria-live regions for dynamic content
   - Screen reader announcements for important changes

6. **Use TypeScript** with proper interfaces for props

7. **Add skeleton loaders** for data fetching states when the component depends on remote data

8. **React patterns**:
   - Use `forwardRef` only when the component truly needs ref forwarding
   - Use standard context providers and hooks when shared state is required
   - Use `useEffect`, `useCallback`, and `useMemo` normally
   - Integrate with app-local data hooks or shared query helpers

9. **Suite-specific integration**:
   - Use Wouter for routing
   - Use Framer Motion for motion where it improves clarity
   - Respect app and workspace environment boundaries
   - Use workspace protocol for internal dependencies

## Related Skills

- **suite-layout-component**: Build shells, panels, and navigation surfaces
- **suite-hooks**: Build data hooks for feature components
- **suite-zustand-store**: Build UI-only state when the component needs shared client state
- **suite-testing**: Add or update tests for interactive components

## Component Structure Template

```tsx
import React from 'react';

interface ComponentNameProps {
  title: string;
  onAction?: () => void;
  className?: string;
}

export function ComponentName({
  title,
  onAction,
  className = '',
}: ComponentNameProps) {

  return (
    <section className={`rounded-xl border border-white/10 bg-[#111111] p-6 ${className}`}>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div>{/* component content */}</div>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-150"
        >
          Action
        </button>
      )}
    </section>
  );
}

// Use forwardRef only when needed for accessibility or composition
export const ComponentWithRef = React.forwardRef<HTMLDivElement, ComponentNameProps>(
  ({ title, onAction, className }, ref) => {
    return (
      <div ref={ref} className={`rounded-xl border border-white/10 bg-[#111111] ${className}`}>
        <h3>{title}</h3>
        {onAction && <button onClick={onAction}>Action</button>}
      </div>
    );
  }
);
ComponentWithRef.displayName = 'ComponentWithRef';

// React 19: Context.Provider pattern
const ThemeContext = React.createContext<'dark' | 'light'>('dark');

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>;
};

// React 19: Ref callback with cleanup
export const ComponentWithCleanup: React.FC = () => {
  const [ref, setRef] = React.useState<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (ref) {
      // Setup
      const observer = new IntersectionObserver(/* ... */);
      observer.observe(ref);

      return () => {
        // Cleanup
        observer.disconnect();
      };
    }
  }, [ref]);

  return <div ref={setRef}>Content with cleanup</div>;
};
```

## Motion Pattern

```tsx
// Add to interactive elements
className = 'transition-all duration-150 ease-out';
```

## Reduced Motion Support

```css
@media (prefers-reduced-motion: no-preference) {
  /* animations here */
}
```
