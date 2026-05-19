import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // next/core-web-vitals includes the Next.js ESLint plugin.
  // next/typescript registers @typescript-eslint so rules below work.
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // ── TypeScript-specific overrides ────────────────────────────────────
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      '@typescript-eslint/no-require-imports': 'warn',
      'prefer-const': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      'react/no-unescaped-entities': 'off',
      // Suppress the no-img-element warning globally — we use <img> intentionally
      // for face-api.js photo rendering and dynamic member photos.
      // Switch to next/image for static assets over time.
      '@next/next/no-img-element': 'warn',
      // Custom font in layout.tsx is intentional (single root layout = loads once)
      '@next/next/no-page-custom-font': 'off',
    },
  },

  // ── Relaxed rules for lib + hooks (legacy API adapters) ──────────────
  {
    files: ['src/hooks/**/*.ts', 'src/lib/**/*.ts', 'src/lib/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // ── General rules ────────────────────────────────────────────────────
  {
    rules: {
      'prefer-const': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'react/no-unescaped-entities': 'off',
    },
  },

  // Ignore generated / build / config files
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      '*.config.js',
      '*.config.mjs',
      'postcss.config.js',
      'tailwind.config.ts',
    ],
  },
];

export default eslintConfig;
