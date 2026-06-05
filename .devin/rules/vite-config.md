---
trigger: always_on
---

# Vite Configuration Rules

This project uses Vite 7.3.2 with platform-agnostic optimizations and conditional plugin loading. Follow these configuration patterns.

<!-- SECTION: project_setup -->

<project_setup>

- Use Vite 7.3.2 for React 19.1.0 + TypeScript projects
- Configure path aliases in vite.config.ts for clean imports
- Use @/ alias for src directory imports, @assets/ for attached_assets
- Validate required environment variables (PORT, BASE_PATH) with error throwing
- Conditional loading of development plugins based on NODE_ENV
  </project_setup>

<!-- ENDSECTION: project_setup -->

<!-- SECTION: configuration_structure -->

<configuration_structure>

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
// import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// Environment variable validation
const rawPort = process.env.PORT;
if (!rawPort) {
  throw new Error('PORT environment variable is required but was not provided.');
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;
if (!basePath) {
  throw new Error('BASE_PATH environment variable is required but was not provided.');
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // runtimeErrorOverlay(),
    // ...(process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined
    //   ? [
    //       await import('@replit/vite-plugin-cartographer').then((m) =>
    //         m.cartographer({
    //           root: path.resolve(import.meta.dirname, '..'),
    //         })
    //       ),
    //       await import('@replit/vite-plugin-dev-banner').then((m) => m.devBanner()),
    //     ]
    //   : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(import.meta.dirname, '..', '..', 'attached_assets'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
```

</configuration_structure>

<!-- ENDSECTION: configuration_structure -->

<!-- SECTION: replit_plugins -->

<development_plugins>

- **Runtime Error Modal**: Enhanced error display for debugging
- **Conditional Loading**: Only load when NODE_ENV !== "production"
- **Performance**: Plugins excluded from production builds for optimization
  </development_plugins>

<!-- ENDSECTION: replit_plugins -->

<!-- SECTION: environment_validation -->

<environment_validation>

- **Required Variables**: PORT and BASE_PATH must be defined
- **PORT Validation**: Must be a valid number (NaN check)
- **BASE_PATH Validation**: Must be a non-empty string
- **Error Handling**: Vite config throws descriptive errors for missing/invalid variables
- **Development vs Production**: Different validation rules for each environment
  </environment_validation>

<!-- ENDSECTION: environment_validation -->

<!-- SECTION: tsconfig_paths -->

<tsconfig_paths>

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@assets/*": ["../attached_assets/*"]
    }
  }
}
```

</tsconfig_paths>

<!-- ENDSECTION: tsconfig_paths -->

<!-- SECTION: environment_variables -->

<environment_variables>

- **Required**: PORT (server port), BASE_PATH (routing base)
- **Optional**: NODE_ENV (development/production)
- **Access**: import.meta.env.VITE*VARIABLE_NAME for VITE* prefixed variables
- **Process**: process.env for Node.js environment variables
- **Validation**: Required variables validated in Vite config
  </environment_variables>

<!-- ENDSECTION: environment_variables -->

<!-- SECTION: replit_deployment -->

<deployment>

- **Port Mapping**: Internal 23379 → External 80
- **Build Output**: dist/public directory for static assets
- **Node.js Runtime**: Optimized for Node.js 24 with ES modules
- **Post-Build**: Automatic pnpm store pruning for smaller images
- **Environment**: Platform provides PORT and other runtime variables
  </deployment>

<!-- ENDSECTION: replit_deployment -->

<!-- SECTION: build_optimization -->

<build_optimization>

- **Source Maps**: Enabled for debugging (hidden in production)
- **Manual Chunks**: vendor and UI libraries separated
- **Tree Shaking**: Automatic unused code elimination
- **Output Directory**: dist/public for platform deployment
- **Empty OutDir**: Clean builds every time
- **Asset Optimization**: Proper naming and caching strategies
  </build_optimization>

<!-- ENDSECTION: build_optimization -->

<!-- SECTION: dev_server -->

<dev_server>

- **Port Configuration**: PORT environment variable with fallback to 3000
- **Host**: 0.0.0.0 for network access
- **Strict Port**: Ensures port availability or fails fast
- **Allowed Hosts**: True for flexible deployment
- **Hot Reload**: Automatic with Vite HMR
  </dev_server>

<!-- ENDSECTION: dev_server -->

<!-- SECTION: strict_constraints -->

<strict_constraints>

- **Framework**: Use Vite, NOT Next.js, Remix, or any SSR framework
- **Build Output**: Static SPA bundles in dist/public
- **Platform Specific**: Use platform-specific plugins and configurations, NOT Vercel/Netlify
- **Environment Variables**: Validate required variables, don't assume they exist
- **Path Aliases**: Use @/ for src, @assets/ for attached_assets
- **Plugins**: Conditional loading of development plugins
  </strict_constraints>

<!-- ENDSECTION: strict_constraints -->
