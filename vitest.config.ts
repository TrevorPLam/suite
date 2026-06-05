import { defineConfig } from 'vitest/config';

// Root Vitest configuration for Node-environment tests.
// Covers domain packages and API packages.
// Web apps (apps/*/web) own their own vitest.config.ts with a browser environment.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/*/api/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.nx', 'apps/*/web/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'dist',
        '.nx',
        'apps/*/web/**/*',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/specs/**',
        '**/test-setup.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        // Domain packages require higher coverage (business logic)
        'packages/domain-calendar/**': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        'packages/domain-tasks/**': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        'packages/domain-drive/**': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        // API packages require strong coverage (contract validation)
        'apps/*/api/**': {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
      },
    },
  },
});
