---
name: create-react-component
description: Guides the creation of React components with TypeScript, Tailwind CSS v4, and shadcn/ui following the YDM project's visual identity and accessibility standards
---

## Component Creation Checklist for YDM (2026)

1. **Determine component location** based on artifact and functionality:

   **Nexus Digital Frontend (`artifacts/nexus-digital/`)**:
   - Pages: `src/pages/` (Home, Industry, Process, About, Blog, Contact)
   - Custom components: `src/components/` (Navbar, Footer, ParticleNetwork, etc.)
   - Reusable UI components: `src/components/ui/` (shadcn/ui)

   **Mockup Sandbox (`artifacts/mockup-sandbox/`)**:
   - Mockup components: `src/components/mockups/` (for preview system)
   - UI components: `src/components/ui/` (shadcn/ui)

   **API Server (`artifacts/api-server/`)**:
   - Route handlers: `src/routes/` (API endpoints)
   - Middleware: `src/middleware/` (Express middleware)
   - Utilities: `src/lib/` (backend utilities)

2. **Use shadcn/ui components as base** when available (Tailwind v4)
   - Note: YDM uses Tailwind CSS v4.1.14 with Vite plugin integration
   - Components use forwardRef for ref forwarding (React 19 pattern)
   - CSS custom properties for theming (tokens.css)
   - Glass morphism effects throughout design system

3. **Apply visual identity**:
   - Glass panels: `backdrop-blur-md bg-white/5 border border-white/10 rounded-xl`
   - Electric blue accent: `#0066ff → #00aaff` for CTAs, focus rings, active states
   - Dark backgrounds: `#000000`, `#0a0a0a`, `#111111`, `#1a1a1a`

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

6. **Use TypeScript** with proper interfaces for props (TypeScript 5.9.2)

7. **Add skeleton loaders** for data fetching states (using TanStack Query)

8. **React 19 patterns**:
   - Use `forwardRef` for components that need ref forwarding
   - Use `<Context.Provider>` for context providers
   - Use standard ref callbacks with cleanup functions
   - Consider Suspense boundaries with React.lazy() for code splitting
   - Use standard form handling with React Hook Form
   - Use FormEvent for form submissions
   - Use TanStack Query v5.90.21 for optimistic UI updates
   - Use standard useEffect/useCallback/useMemo hooks
   - Integrate with generated API hooks from `@workspace/api-client-react`

9. **YDM-Specific Integration**:
   - Use Wouter for routing (not React Router)
   - Import API hooks from `@workspace/api-client-react`
   - Use Framer Motion 11.0.0 for animations (not motion library)
   - Respect platform environment variables (PORT, BASE_PATH)
   - Use workspace protocol for internal dependencies

## Related Skills

- **motion-implementation**: Add animations and micro-interactions to components
- **form-components**: For creating form components with validation
- **accessibility**: Ensure WCAG 2.2 AA compliance
- **performance**: Optimize component rendering and Core Web Vitals

## Component Structure Template (React 19 - YDM)

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useUsersQuery } from '@workspace/api-client-react'; // Example API hook

interface ComponentNameProps {
  title: string;
  onAction?: () => void;
  className?: string;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  title,
  onAction,
  className = '',
}) => {
  const { data: users, isLoading } = useUsersQuery();

  return (
    <motion.div
      className={`backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {isLoading ? (
        <div className="animate-pulse">Loading...</div>
      ) : (
        <div>
          {/* component content */}
          {users && <p>Found {users.length} users</p>}
        </div>
      )}
      {onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-150"
        >
          Action
        </button>
      )}
    </motion.div>
  );
};

// React 19: Use forwardRef for ref forwarding
export const ComponentWithRef = React.forwardRef<HTMLDivElement, ComponentNameProps>(
  ({ title, onAction, className }, ref) => {
    return (
      <div ref={ref} className={`glass-card ${className}`}>
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
