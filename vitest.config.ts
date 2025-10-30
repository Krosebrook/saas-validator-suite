import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['backend/tests/**/*.test.ts', 'frontend/tests/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'build'],
    restoreMocks: true,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
      all: false,
      include: ['backend/**/*.ts', 'frontend/**/*.tsx'],
      exclude: ['**/*.d.ts', 'backend/tests/**', 'frontend/tests/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend'),
      '~backend': path.resolve(__dirname, './backend'),
    },
  },
});
