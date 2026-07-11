type EnvSpec = {
  key: string;
  required: boolean;
  validator?: (val: string) => boolean;
  hint: string;
};

const ENV_SPECS: EnvSpec[] = [
  {
    key: 'NEXT_PUBLIC_API_URL',
    required: false,
    validator: (v) => {
      if (!v) return true;
      try { new URL(v); return true; } catch { return false; }
    },
    hint: 'Must be a valid URL, e.g. https://api.619fitness.in',
  },
];

export function validateEnv(): void {
  const errors: string[] = [];

  for (const spec of ENV_SPECS) {
    const val = process.env[spec.key] ?? '';

    if (spec.required && !val) {
      errors.push(`  ${spec.key} is required but not set. ${spec.hint}`);
      continue;
    }

    if (val && spec.validator && !spec.validator(val)) {
      errors.push(`  ${spec.key}="${val}" is invalid. ${spec.hint}`);
    }

    if (spec.key === 'NEXT_PUBLIC_API_URL' && val.includes('your-619-api')) {
      errors.push(`  ${spec.key} still contains placeholder URL. Set actual API URL.`);
    }
  }

  if (errors.length > 0) {
    const msg = `Environment validation failed:\n${errors.join('\n')}\nFix these variables in your .env.local / Vercel project settings.`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    } else {
      console.warn('[Coach Abhishek] ' + msg);
    }
  }
}
