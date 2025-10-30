import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'build'],
    restoreMocks: true,
    setupFiles: ['./tests/setup.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '~backend': path.resolve(__dirname, '../backend'),
    },
  },
});
