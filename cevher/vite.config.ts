/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// `vite build --mode pages` writes a source-map-free build (index.html + assets/) to the repository
// root, which GitHub Pages serves as the site's home page. Regular builds go to dist/.
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

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
    outDir: mode === 'pages' ? repoRoot : 'dist',
    // Never wipe the repository root; `npm run build:pages` removes the old assets/ itself.
    emptyOutDir: mode !== 'pages',
    sourcemap: mode !== 'pages',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
