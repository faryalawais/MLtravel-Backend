import path from 'node:path';
import { fileURLToPath } from 'node:url';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, '.'),
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  test: {
    name: 'api',
    include: ['tests/api/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    globals: false,
  },
});
