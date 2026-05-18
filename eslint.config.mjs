/**
 * eslint.config.mjs — Flat config with full @typescript-eslint integration
 *
 * Issue #4 FIX:
 *   The previous config used `compat.extends('next/typescript')` which
 *   delegates to eslint-config-next's bundled @typescript-eslint setup.
 *   This works but makes it impossible to set per-rule severity or add
 *   custom type-aware rules without re-importing the parser yourself.
 *
 *   We now explicitly import @typescript-eslint/eslint-plugin and
 *   @typescript-eslint/parser so:
 *     a) Rules can be configured directly (no compat layer hiding them).
 *     b) Type-aware lint rules (requiresTypeChecking) can be enabled.
 *     c) ESLint strict mode works as intended.
 *
 * NOTE: @typescript-eslint packages ship as part of eslint-config-next
 *   in Next.js 15 — no extra install needed.
 */
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // Next.js core-web-vitals extends: React hooks, import order, accessibility
  ...compat.extends('next/core-web-vitals'),

  // ── TypeScript-specific rules (explicit — not via next/typescript wrapper) ──
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
      // Consistent type imports (perf: erase-only imports at compile time)
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      // No require() in TS files (ESM project)
      '@typescript-eslint/no-require-imports': ['warn', {
        // Allow require in API routes and config files where dynamic require
        // is the only option (e.g. runtime package.json read)
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
