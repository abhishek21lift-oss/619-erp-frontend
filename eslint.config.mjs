import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Warn on unused variables (errors would block the build on legacy code)
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Allow `any` in catch blocks and legacy API responses
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow non-null assertions in well-understood contexts
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Prefer const
      'prefer-const': 'error',
      // No console.log in production code (use console.warn/error for real issues)
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    // Relax rules for hooks and migration utilities
    files: ['src/hooks/**', 'src/lib/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

export default eslintConfig;
