import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@suite/ui': path.resolve(__dirname, './src'),
    },
  },
});
