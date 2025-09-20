import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./frontend/tests/setup.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend'),
      '~backend': path.resolve(__dirname, './backend'),
    },
  },
});
