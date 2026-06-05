---
name: ydm-mockup-development
description: Guide for developing components in the YDM mockup sandbox with hot reload, dynamic loading, and preview system
---

# YDM Mockup Sandbox Development

This skill guides you through creating and testing components in the YDM mockup sandbox system, which provides real-time component preview and development capabilities.

## Understanding the Mockup System

### **Architecture Overview**

```
Component Creation → Plugin Discovery → Dynamic Import → Preview Rendering
```

### **Key Components**

- **mockup-sandbox/**: Component preview application
- **mockupPreviewPlugin.ts**: Vite plugin for component discovery
- **src/components/mockups/**: Component development directory
- **.generated/mockup-components.ts**: Auto-generated import map

## Component Development Workflow

### **1. Create Component Structure**

#### **Component Location**

```typescript
// artifacts/mockup-sandbox/src/components/mockups/YourComponent.tsx
import React from 'react';

// Default export (primary method)
export default function YourComponent() {
  return (
    <div className="p-4 bg-white/10 rounded-lg">
      <h2>Your Component</h2>
      <p>This is a mockup component</p>
    </div>
  );
}

// Optional: Named export for specific preview
export function Preview() {
  return (
    <div className="p-8 bg-gradient-to-r from-blue-500 to-purple-600">
      <YourComponent />
    </div>
  );
}

// Optional: Multiple named exports
export function VariantA() {
  return <YourComponent />;
}

export function VariantB() {
  return (
    <div className="scale-110">
      <YourComponent />
    </div>
  );
}
```

#### **Component Resolution Priority**

1. **Default Export**: `export default Component`
2. **Preview Export**: `export const Preview`
3. **Named Export**: `export const ComponentName`
4. **Last Function**: Fallback to last function component found

### **2. Plugin Auto-Discovery**

#### **File Watching Configuration**

The plugin automatically:

- Scans `src/components/mockups/**/*.tsx` for components
- Excludes files/directories starting with `_` (private)
- Watches for file changes with 100ms debouncing
- Regenerates import map on file add/remove

#### **Generated Import Map**

```typescript
// .generated/mockup-components.ts (auto-generated)
export const modules = {
  './components/mockups/Button.tsx': () => import('../components/mockups/Button.tsx'),
  './components/mockups/Card.tsx': () => import('../components/mockups/Card.tsx'),
  './components/mockups/YourComponent.tsx': () => import('../components/mockups/YourComponent.tsx'),
  // ... auto-generated entries
};

export interface DiscoveredComponent {
  globKey: string;
  importPath: string;
}
```

### **3. Access Component Preview**

#### **URL Structure**

- **Gallery**: Root path (`/`) shows component server info
- **Individual Preview**: `/preview/YourComponent` renders specific component
- **Base Path Support**: Respects `BASE_URL` environment variable

#### **Preview URL Examples**

```bash
# Development URLs
http://localhost:5173/                    # Component gallery
http://localhost:5173/preview/Button       # Button component
http://localhost:5173/preview/YourComponent # Your component

# With base path
http://localhost:5173/base/preview/Button   # With BASE_PATH=/base
```

## Advanced Component Patterns

### **Interactive Components**

```typescript
// artifacts/mockup-sandbox/src/components/mockups/InteractiveCard.tsx
import React, { useState } from 'react';

export default function InteractiveCard() {
  const [count, setCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`p-6 rounded-xl transition-all duration-300 ${
        isHovered ? 'bg-blue-500/20 scale-105' : 'bg-white/10'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3 className="text-lg font-bold mb-4">Interactive Card</h3>
      <p className="mb-4">Hover and click to interact</p>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600"
      >
        Clicked {count} times
      </button>
    </div>
  );
}
```

### **Data-Driven Components**

```typescript
// artifacts/mockup-sandbox/src/components/mockups/DataTable.tsx
import React from 'react';

interface DataRow {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  lastUpdated: string;
}

const mockData: DataRow[] = [
  { id: 1, name: 'John Doe', status: 'active', lastUpdated: '2024-01-15' },
  { id: 2, name: 'Jane Smith', status: 'inactive', lastUpdated: '2024-01-10' },
  { id: 3, name: 'Bob Johnson', status: 'active', lastUpdated: '2024-01-20' },
];

export default function DataTable() {
  return (
    <div className="p-6 bg-white/10 rounded-xl">
      <h3 className="text-xl font-bold mb-4">Data Table</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/20">
              <th className="pb-2">ID</th>
              <th className="pb-2">Name</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((row) => (
              <tr key={row.id} className="border-b border-white/10">
                <td className="py-2">{row.id}</td>
                <td className="py-2">{row.name}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    row.status === 'active'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-gray-500/20 text-gray-300'
                  }`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-2">{row.lastUpdated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### **Animation Components**

```typescript
// artifacts/mockup-sandbox/src/components/mockups/AnimatedBox.tsx
import React from 'react';
import { motion } from 'framer-motion';

export default function AnimatedBox() {
  return (
    <div className="p-8 flex items-center justify-center">
      <motion.div
        className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl"
        animate={{
          rotate: [0, 180, 360],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}

// Preview with different animation
export function Preview() {
  return (
    <div className="p-8 bg-black/50">
      <motion.div
        className="w-48 h-48 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl shadow-2xl"
        animate={{
          y: [0, -20, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}
```

## Development Features

### **Hot Reload System**

- **File Changes**: Automatic component reload on save
- **New Components**: Auto-discovery and import map regeneration
- **Error Handling**: Graceful error display for missing/invalid components
- **Debouncing**: 100ms stability threshold prevents excessive rebuilds

### **Error Display**

```typescript
// Component error boundary handling
const PreviewRenderer: React.FC<{ componentName: string }> = ({ componentName }) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComponent(componentName)
      .then(setComponent)
      .catch(setError);
  }, [componentName]);

  if (error) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/30 rounded-xl">
        <h3 className="text-red-400 font-bold mb-2">Component Error</h3>
        <p className="text-red-300">{error}</p>
        <p className="text-sm text-gray-400 mt-2">
          Check the component file and ensure it exports a valid React component.
        </p>
      </div>
    );
  }

  if (!Component) {
    return <div className="p-8">Loading component...</div>;
  }

  return <Component />;
};
```

### **Component Gallery**

```typescript
// Root path shows available components
const ComponentGallery: React.FC = () => {
  const [components, setComponents] = useState<string[]>([]);

  useEffect(() => {
    // Load discovered components from plugin
    loadDiscoveredComponents().then(setComponents);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Mockup Components</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {components.map((component) => (
          <div key={component} className="p-4 bg-white/10 rounded-xl">
            <h3 className="font-bold mb-2">{component}</h3>
            <a
              href={`/preview/${component}`}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Preview Component
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Integration Patterns

### **Using shadcn/ui Components**

```typescript
// artifacts/mockup-sandbox/src/components/mockups/FormExample.tsx
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export default function FormExample() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Contact Form</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full">
            {submitted ? 'Submitted!' : 'Submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### **Testing Component Variants**

```typescript
// artifacts/mockup-sandbox/src/components/mockups/ButtonVariants.tsx
import React from 'react';
import { Button } from '../ui/button';

export default function ButtonVariants() {
  return (
    <div className="p-6 space-y-4">
      <h3 className="text-xl font-bold">Button Variants</h3>

      <div className="flex flex-wrap gap-4">
        <Button variant="default">Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
      </div>
    </div>
  );
}

// Preview with different context
export function Preview() {
  return (
    <div className="p-8 bg-gradient-to-br from-purple-900 to-blue-900">
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white text-center">Button Showcase</h2>
        <ButtonVariants />
      </div>
    </div>
  );
}
```

## Best Practices

### **Component Organization**

- Use descriptive component names
- Keep components focused on single purpose
- Export multiple variants for comparison
- Use Preview export for styled showcase

### **Performance Optimization**

- Avoid heavy computations in render
- Use React.memo for expensive components
- Implement proper cleanup in useEffect
- Test with multiple components loaded

### **Development Workflow**

1. Create component in `src/components/mockups/`
2. Plugin auto-generates import map
3. Access via `/preview/ComponentName`
4. Iterate with hot reload
5. Test different variants and states

### **Common Issues**

- **Component Not Found**: Check file naming and export structure
- **Hot Reload Not Working**: Verify file watcher is running
- **Import Errors**: Ensure component exports valid React component
- **Styling Issues**: Check Tailwind CSS classes are available

## Troubleshooting

### **Plugin Issues**

```bash
# Restart development server
pnpm --filter @workspace/mockup-sandbox run dev

# Clear generated files
rm -rf .generated/

# Check plugin logs in terminal
```

### **Component Loading Issues**

- Verify component has valid React export
- Check for TypeScript errors in component file
- Ensure component doesn't have unmet dependencies
- Test with simple component first

This mockup system provides an excellent development environment for rapid component prototyping and testing within the YDM ecosystem.
