import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // Next.js core-web-vitals extends: React hooks, import order, accessibility
  ...compat.extends('next/core-web-vitals'),

  // ── TypeScript-specific rules ──────────────────────────────────────────
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Unused vars: warn so legacy code doesn't block the build
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      // Explicit any: warn — ban in new code, tolerated in legacy lib code
      '@typescript-eslint/no-explicit-any': 'warn',
      // Non-null assertions: warn — prefer optional chaining
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Consistent type imports: warn (not error) — existing codebase has many imports
      // that would need the 'type' keyword; enforce as warning only
      '@typescript-eslint/consistent-type-imports': ['warn', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      // No require() in TS files (ESM project)
      '@typescript-eslint/no-require-imports': ['warn', {
        allow: ['package.json'],
      }],
      // Prefer const
      'prefer-const': 'error',
      // No console.log (use warn/error/info for intentional output)
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },

  // ── Relaxed rules for lib + hooks (legacy API adapters) ──
  {
    files: ['src/hooks/**/*.ts', 'src/lib/**/*.ts', 'src/lib/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },

  // ── Ignore generated / config files ──
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
