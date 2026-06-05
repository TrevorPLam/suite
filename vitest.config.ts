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
  },
});
