// An inline shadow that is byte-identical to a token is a token that was
// pasted instead of referenced.
//
// The interesting part is what that costs. Every --shadow* token is defined
// twice, once under :root and once under the dark theme, and the two are not
// small variations: --shadow-xs is rgba(15,23,42,0.04) in light and
// rgba(0,0,0,0.38) in dark, roughly ten times the opacity, because a 4%
// slate shadow is invisible on a dark surface. So a pasted literal is not
// merely untidy — it silently opts that one element out of dark mode.
//
// Both sites this found were the same card wrapper, duplicated across the two
// payment pages, already using var(--bg-elevated) and var(--border) on the
// lines either side of the pasted shadow. Nothing else in the app matched.
//
// This is NOT a sweep of the other 360 inline shadows. Those are not
// byte-identical to anything, so replacing them would be approximation, and
// approximating 360 shadows is a redesign.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { srcPath } from '@/__tests__/helpers/app-routes';

const css = readFileSync(srcPath('app', 'globals.css'), 'utf8');
const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/,\s+/g, ',').trim().toLowerCase();

/** Token → its light value (the first of the two definitions). */
const tokens = (() => {
  const light = new Map<string, string>();
  for (const m of css.matchAll(/--(shadow[-a-z0-9]*)\s*:\s*([^;]+);/g)) {
    if (!light.has(m[1])) light.set(m[1], norm(m[2]));
  }
  return light;
})();

interface Shadow { value: string; at: string }

const inlineShadows: Shadow[] = (() => {
  const out: Shadow[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (!['node_modules', '__tests__'].includes(e.name)) walk(p); continue; }
      if (!/\.(tsx?|css)$/.test(e.name)) continue;
      const rel = relative(process.cwd(), p).replace(/\\/g, '/');
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/boxShadow:\s*[`'"]([^`'"]+)[`'"]/g)) {
          out.push({ value: norm(m[1]), at: `${rel}:${i + 1}` });
        }
        for (const m of line.matchAll(/box-shadow:\s*([^;]+);/g)) {
          out.push({ value: norm(m[1]), at: `${rel}:${i + 1}` });
        }
      });
    }
  };
  walk(join(process.cwd(), 'src'));
  return out;
})();

describe('the scan found something to scan', () => {
  it('sees both the tokens and the call sites', () => {
    expect(tokens.size).toBeGreaterThanOrEqual(11);
    expect(inlineShadows.length).toBeGreaterThan(300);
    expect(inlineShadows.filter((s) => s.value.includes('var(--shadow')).length)
      .toBeGreaterThan(50);
  });
});

describe('no shadow is a token in disguise', () => {
  it('has no inline value byte-identical to a token', () => {
    const values = new Set(tokens.values());
    const pasted = inlineShadows.filter((s) => values.has(s.value));
    expect(
      pasted.map((s) => `${s.at}  ${s.value}`),
      'this equals a --shadow* token exactly; reference it instead, or dark mode will not apply',
    ).toEqual([]);
  });

  it('fixed the two payment cards rather than leaving them light-only', () => {
    for (const file of [
      ['app', '(bare)', 'subscription', 'checkout', '[id]', 'page.tsx'],
      ['app', '(chrome)', 'pay', '[orderId]', 'page.tsx'],
    ]) {
      const src = readFileSync(srcPath(...file), 'utf8');
      expect(src).toMatch(/boxShadow: 'var\(--shadow-xs\)'/);
      expect(src).not.toMatch(/boxShadow: '0 1px 2px rgba\(15,23,42,0\.04\)'/);
    }
  });
});

describe('the tokens themselves', () => {
  it('are each defined for both themes', () => {
    // The premise of the test above. If a token had only a light definition,
    // referencing it would be no better than pasting it.
    for (const name of tokens.keys()) {
      const defs = [...css.matchAll(new RegExp(`--${name}\\s*:`, 'g'))].length;
      expect(defs, `--${name} is defined ${defs} time(s), expected light and dark`)
        .toBeGreaterThanOrEqual(2);
    }
  });
});
