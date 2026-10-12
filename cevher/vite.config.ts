/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// `vite build --mode pages` writes a source-map-free build to play/, which GitHub Pages serves
// (https://<user>.github.io/<repo>/cevher/play/). Regular builds go to dist/.
export default defineConfig(({ mode }) => ({
  // Relative base so the production build works from any sub-path (PWA, static hosting).
  base: './',
  plugins: [preact()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    outDir: mode === 'pages' ? 'play' : 'dist',
    emptyOutDir: true,
    sourcemap: mode !== 'pages',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
