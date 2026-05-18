/**
 * env.ts — Runtime environment validation (Issue #22)
 *
 * WHY: Missing or malformed env vars cause cryptic runtime errors far from
 * their source. Validating early produces a clear, actionable error message.
 *
 * USAGE: Import this module from app/layout.tsx (server-only execution).
 * It throws at startup if required vars are missing in production.
 *
 * SSR-SAFE: Only executes on the server (no `typeof window` guard needed
 * because Next.js never bundles this into the client bundle when imported
 * from a Server Component).
 */

type EnvSpec = {
  key: string;
  required: boolean;
  validator?: (val: string) => boolean;
  hint: string;
};

const ENV_SPECS: EnvSpec[] = [
  {
    key: 'NEXT_PUBLIC_API_URL',
    required: false, // optional — defaults to localhost in dev
    validator: (v) => {
      if (!v || v === 'http://localhost:5000') return true;
      try { new URL(v); return true; } catch { return false; }
    },
    hint: 'Must be a valid URL, e.g. https://api.619fitness.in',
  },
  {
    key: 'NEXT_PUBLIC_API_URL',
    required: false,
    validator: (v) => !v.includes('your-619-api'),
    hint: 'Remove placeholder — set actual API URL',
  },
];

/** Call once from the root Server Component in production. */
export function validateEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const errors: string[] = [];

  for (const spec of ENV_SPECS) {
    const val = process.env[spec.key] ?? '';

    if (spec.required && !val) {
      errors.push(`  ✗ ${spec.key} is required but not set. ${spec.hint}`);
      continue;
    }

    if (val && spec.validator && !spec.validator(val)) {
      errors.push(`  ✗ ${spec.key}="${val}" is invalid. ${spec.hint}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.join('\n')}\n` +
      'Fix these variables in your .env.local / Vercel project settings / Docker ARGs.',
    );
  }
}
