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
      provider: 'istanbul',
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
        branches: 80,
        statements: 80,
      },
    },
  },
});
