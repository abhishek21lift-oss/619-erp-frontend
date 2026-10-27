// Design-system guardrail: "how colours are referenced" plus the non-colour
// slop patterns. The colour authority — which hex values are legal — stays in
// palette.test.ts. Both scans share helpers/token-files.ts so their exemptions
// cannot drift apart.
//
// The baseline only ratchets downward. UPDATE_BASELINE=1 rewrites it, but
// refuses to raise any count.

import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { isDecorativeTheme } from './helpers/token-files';

const PATTERNS = {
  literalHex: /#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b/g,
  rgbaLiteral: /\brgba?\((?!\s*var\()/g,
  gradientText: /bg-clip-text|text-transparent/g,
  sideTab: /borderLeft:\s*[`'"]3px solid|border-l-\[3px\]/g,
  springEasing: /0\.34,\s*1\.56,\s*0\.64,\s*1/g,
  aiHue: /(?:from|via|to)-(?:indigo|violet|purple|fuchsia)-\d{3}/g,
  plainImg: /<img\b/g,
} as const;

type Pattern = keyof typeof PATTERNS;

const BASELINE_PATH = join(process.cwd(), 'src/__tests__/fixtures/design-baseline.json');
const UPDATE = process.env.UPDATE_BASELINE === '1';

function scan() {
  const counts = {} as Record<Pattern, { total: number; files: Array<[string, number]> }>;
  for (const key of Object.keys(PATTERNS) as Pattern[]) counts[key] = { total: 0, files: [] };

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) {
        if (entry === '__tests__') continue;
        walk(p);
        continue;
      }
      if (!/\.(tsx?|css)$/.test(entry)) continue;

      const relToSrc = relative(join(process.cwd(), 'src'), p).replaceAll(sep, '/');
      if (relToSrc === 'app/globals.css' || isDecorativeTheme(relToSrc)) continue;

      const text = readFileSync(p, 'utf8');
      for (const key of Object.keys(PATTERNS) as Pattern[]) {
        const n = (text.match(PATTERNS[key]) ?? []).length;
        if (n) {
          counts[key].total += n;
          counts[key].files.push([relToSrc, n]);
        }
      }
    }
  };

  walk(join(process.cwd(), 'src/app'));
  walk(join(process.cwd(), 'src/components'));
  return counts;
}

const counts = scan();
const baseline: Partial<Record<Pattern, number>> = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  : {};

describe('design-system guardrails', () => {
  if (UPDATE) {
    it('rewrites the baseline downward only', () => {
      const next = {} as Record<Pattern, number>;
      for (const key of Object.keys(PATTERNS) as Pattern[]) {
        const previous = baseline[key];
        if (typeof previous === 'number' && counts[key].total > previous) {
          throw new Error(
            `Refusing to raise ${key}: baseline ${previous}, now ${counts[key].total}.`,
          );
        }
        next[key] = counts[key].total;
      }
      mkdirSync(dirname(BASELINE_PATH), { recursive: true });
      writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
    });
  } else {
    for (const key of Object.keys(PATTERNS) as Pattern[]) {
      it(`${key} does not exceed its baseline`, () => {
        const limit = baseline[key];
        if (typeof limit !== 'number') {
          throw new Error(
            `No baseline for ${key}. Run UPDATE_BASELINE=1 npx vitest run src/__tests__/design-system-guardrails.test.ts to seed the baseline.`,
          );
        }
        const top = [...counts[key].files]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([file, n]) => `  ${file} (${n})`)
          .join('\n');
        expect(counts[key].total, `${key}: ${counts[key].total} > baseline ${limit}\n${top}`)
          .toBeLessThanOrEqual(limit);
      });
    }
  }
});
