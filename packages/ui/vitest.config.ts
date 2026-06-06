import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      reportOnFailure: true,
      exclude: [
        'node_modules',
        'dist',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/specs/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@suite/ui': path.resolve(__dirname, './src'),
    },
  },
});
