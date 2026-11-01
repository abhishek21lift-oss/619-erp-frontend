import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
      },
    },
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    // .worktrees holds full checkouts of this repo; running their tests from
    // here runs yesterday's copy of every file twice.
    exclude: ['e2e/**', 'node_modules/**', '.worktrees/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});