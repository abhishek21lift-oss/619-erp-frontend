import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tsParser from '@typescript-eslint/parser';
import tseslint from '@typescript-eslint/eslint-plugin';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      '_parse-check.js',
      '_pcheck.js',
      '*.config.js',
      '*.config.mjs',
      // Vendored agent skills. Third-party code installed by `npx skills add`,
      // not project source: linting it reports 25 warnings nobody here can fix
      // and drowns the ones that are ours.
      '.claude/skills/**',
      '.agents/skills/**',
      'postcss.config.js',
      'tailwind.config.ts',
    ],
  },

  {
    files: ['**/*.{js,jsx,ts,tsx}'],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@typescript-eslint': tseslint,
    },

    settings: {
      next: {
        rootDir: ['.'],
      },
    },

    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ── Accessibility ──────────────────────────────────────────────────
      //
      // There was no accessibility linting at all before this, so CI had
      // never looked at any of it. The first run found 75 real problems — and
      // 41 false ones, all from `aria-role`, which checks every JSX element
      // with a `role` prop including custom components. `<Guard role="member">`
      // is an application role, not an ARIA role; `ignoreNonDOM` is what tells
      // the rule the difference.
      ...jsxA11y.flatConfigs.recommended.rules,
      'jsx-a11y/aria-role': ['warn', { ignoreNonDOM: true }],

      // Errors, not warnings. These three are the ones that decide whether a
      // control can be operated without a mouse at all, and the codebase is
      // now clean of them — so the only way one appears is in new code, where
      // it is cheapest to fix.
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/html-has-lang': 'error',

      // `depth: 3`, because the default of 2 cannot see far enough.
      //
      // The one file this rule flagged — platform/ai-control.tsx — has a label
      // that is genuinely correct: the <input> is a direct child, giving an
      // implicit association, and the text sits inside the label so it is the
      // accessible name. It is just wrapped two spans deep to lay a title and
      // a description out under one control. Rewriting correct markup to
      // satisfy a depth limit would be changing the code to suit the linter.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],

      // Warnings, deliberately. The 47 remaining hits are almost all modal
      // BACKDROPS — `<div onClick={close}>` — and the correct fix for those is
      // Escape plus a focus trap (see src/hooks/useDialogA11y.ts), never an
      // onKeyDown that adds a tab stop doing nothing. Erroring here would push
      // the next person toward the wrong fix.
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/mouse-events-have-key-events': 'warn',
      'jsx-a11y/no-autofocus': 'warn',

      '@typescript-eslint/no-explicit-any': 'warn',

      'prefer-const': 'warn',

      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'info'],
        },
      ],
    },
  },
];

export default eslintConfig;