import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // next/typescript registers the @typescript-eslint plugin so that
  // @typescript-eslint/* rules can be referenced in subsequent rule blocks.
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // ── TypeScript-specific overrides ────────────────────────────────────
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Unused vars: warn so legacy code doesn’t block the build
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
      // Type imports: warn only (many existing files use mixed imports)
      '@typescript-eslint/consistent-type-imports': ['warn', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      // No require() in TS files
      '@typescript-eslint/no-require-imports': 'warn',
      // Prefer const: warn so existing let-but-never-reassigned doesn’t block build
      'prefer-const': 'warn',
      // No console.log
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // next/typescript enables these as errors; downgrade to warn
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      // Unescaped entities in JSX are common in this codebase
      'react/no-unescaped-entities': 'off',
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

  // ── Ignore generated / config files ───────────────────────────────
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
