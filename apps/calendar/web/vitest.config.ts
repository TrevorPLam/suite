import { defineConfig } from 'vitest/config';

// Vitest automatically merges with the sibling vite.config.ts,
// so the React plugin does not need to be repeated here.
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./src/test-setup.ts'],
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
        '**/test-setup.ts',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
});
