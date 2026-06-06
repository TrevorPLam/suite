import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      outDir: 'dist',
      rollupTypes: true,
    }),
    {
      name: 'copy-css',
      closeBundle: () => {
        const stylesDir = resolve(__dirname, 'dist/styles');
        if (!existsSync(stylesDir)) {
          mkdirSync(stylesDir, { recursive: true });
        }
        const sourceCss = resolve(__dirname, 'src/styles/globals.css');
        const targetCss = resolve(__dirname, 'dist/styles/globals.css');
        copyFileSync(sourceCss, targetCss);
      },
    },
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SuiteUI',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      // Preserve module structure for better tree-shaking
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
      // Externalize peer dependencies
      external: [
        'react',
        'react-dom',
        '@radix-ui/react-dialog',
        '@radix-ui/react-select',
        'class-variance-authority',
        'clsx',
        'lucide-react',
        'tailwind-merge',
      ],
    },
    // Generate source maps for development
    sourcemap: true,
    // Minify for production
    minify: 'esbuild',
    // Target modern browsers
    target: 'esnext',
  },
});
