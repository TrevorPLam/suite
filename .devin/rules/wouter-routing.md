---
trigger: always_on
---

# Wouter Routing Rules

This project uses Wouter for routing, not React Router. Wouter is a lightweight alternative that provides the same functionality with a smaller bundle size.

<!-- SECTION: routing_setup -->

<routing_setup>

- **Package**: wouter (catalog version ^3.3.5)
- **Import**: Use Router, Route, Link, and useLocation hooks from wouter
- **Base Path**: Uses BASE_PATH environment variable for deployment
- **Navigation**: Use Link component for client-side navigation
- **Active State**: Detect active routes manually or with useLocation
  </routing_setup>

<!-- ENDSECTION: routing_setup -->

<!-- SECTION: basic_usage -->

<basic_usage>

```typescript
// App.tsx
import { Router, Route } from 'wouter';
import { PageTransition } from './components/PageTransition';

export function App() {
  return (
    <Router base={import.meta.env.BASE_PATH}>
      <PageTransition>
        <Route path="/" component={HomePage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/blog/:slug" component={BlogPostPage} />
        <Route path="/:rest*" component={NotFoundPage} />
      </PageTransition>
    </Router>
  );
}
```

</basic_usage>

<!-- ENDSECTION: basic_usage -->

<!-- SECTION: navigation_patterns -->

<navigation_patterns>

```typescript
// Navbar.tsx
import { Link, useLocation } from 'wouter';

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav>
      <Link href="/" className={location === '/' ? 'active' : ''}>
        Home
      </Link>
      <Link href="/about" className={location === '/about' ? 'active' : ''}>
        About
      </Link>
      <Link href="/contact" className={location === '/contact' ? 'active' : ''}>
        Contact
      </Link>
    </nav>
  );
}
```

</navigation_patterns>

<!-- ENDSECTION: navigation_patterns -->

<!-- SECTION: route_parameters -->

<route_parameters>

- **Static Routes**: `/about`, `/contact`
- **Dynamic Routes**: `/blog/:slug`, `/users/:id`
- **Catch-all**: `/:rest*` for 404 pages
- **Optional Params**: Use RegExp for complex patterns
- **Query Params**: Use URLSearchParams or custom hooks
  </route_parameters>

<!-- ENDSECTION: route_parameters -->

<!-- SECTION: programmatic_navigation -->

<programmatic_navigation>

```typescript
import { useNavigate } from 'wouter';

export function SomeComponent() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/about');
  };

  const goBack = () => {
    navigate(-1);
  };

  return <button onClick={handleClick}>Go to About</button>;
}
```

</programmatic_navigation>

<!-- ENDSECTION: programmatic_navigation -->

<!-- SECTION: route_guards -->

<route_guards>

```typescript
// ProtectedRoute.tsx
import { Route, Redirect } from 'wouter';

export function ProtectedRoute({ path, component: Component }) {
  const [user] = useUser();

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Route path={path} component={Component} />;
}

// Usage
<ProtectedRoute path="/dashboard" component={DashboardPage} />
```

</route_guards>

<!-- ENDSECTION: route_guards -->

<!-- SECTION: strict_constraints -->

<strict_constraints>

- **No React Router**: Never import from react-router-dom
- **Wouter Only**: Use wouter for all routing needs
- **Base Path**: Always respect BASE_PATH environment variable
- **Link Component**: Use Link for navigation, not <a> tags
- **Route Structure**: Keep routes flat and predictable
- **404 Handling**: Always include catch-all route for 404s
  </strict_constraints>

<!-- ENDSECTION: strict_constraints -->
