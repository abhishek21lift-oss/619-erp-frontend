// Text has to be readable, and that is arithmetic, not opinion.
//
// The audit scored every dimension except accessibility, which it left at
// "?/10" because there is no browser or axe in the agent sandbox. Contrast
// does not need one: the tokens are literal hex and rgba in globals.css, and
// WCAG's ratio is a formula. So this is the part of accessibility that can be
// held to a number, and it is held here.
//
// What it found the first time it ran, in the light theme, as TEXT:
//
//   --warning  1.96:1   "pending", "due soon", "partial"
//   --success  2.32:1   "active", "completed", "paid"
//   --danger   3.44:1   "overdue", "expired", every error message
//
// against a 4.5:1 requirement. Amber was the worst: the words warning most
// urgently about money were the least readable words in the app. ~150 call
// sites set `color: var(--danger)` and friends, and src/lib/palette.ts had
// warned about exactly this from the start — "text on a tint should be 600 or
// darker" — with nothing to enforce it. This is the enforcement.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { srcPath } from '@/__tests__/helpers/app-routes';

const css = readFileSync(srcPath('app', 'globals.css'), 'utf8');

/** The declaration block a selector opens, brace-balanced. */
function block(selector: RegExp): string {
  const i = css.search(selector);
  if (i < 0) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', i);
  let depth = 0;
  for (let j = open; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}' && --depth === 0) return css.slice(open, j);
  }
  throw new Error(`unbalanced block for ${selector}`);
}

function tokens(scope: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of scope.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const LIGHT = tokens(block(/^:root\s*\{/m));
const DARK = tokens(block(/\.dark\s*[,{]/));

/** Follow var() indirection to a literal colour. */
function resolve(value: string | undefined, theme: Record<string, string>, depth = 0): string | undefined {
  if (!value || depth > 10) return undefined;
  const ref = /^var\(--([a-z0-9-]+)\)$/.exec(value.trim());
  // A theme may only override some tokens; the rest come from :root.
  return ref ? resolve(theme[ref[1]] ?? LIGHT[ref[1]], theme, depth + 1) : value;
}

type RGBA = [number, number, number, number];

function parse(value: string | undefined): RGBA | undefined {
  if (!value) return undefined;
  const v = value.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) return [...[0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16)), 1] as RGBA;
  m = /^#([0-9a-f]{3})$/i.exec(v);
  if (m) return [...[...m[1]].map((c) => parseInt(c + c, 16)), 1] as RGBA;
  m = /^rgba?\(([^)]+)\)$/i.exec(v);
  if (m) {
    const p = m[1].split(',').map(Number);
    if (p.length >= 3 && p.every((n) => !Number.isNaN(n))) return [p[0], p[1], p[2], p[3] ?? 1];
  }
  return undefined;
}

/** Flatten a translucent colour onto its backdrop — what the eye receives. */
const over = (fg: RGBA, bg: RGBA): RGBA =>
  fg[3] === 1 ? fg : [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1) as RGBA;

const luminance = (c: RGBA) => {
  const f = c.slice(0, 3).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};

function contrast(fgToken: string, bgToken: string, theme: Record<string, string>): number {
  const page = parse(resolve(theme['bg-canvas'], theme))!;
  const bgRaw = parse(resolve(theme[bgToken], theme));
  const fgRaw = parse(resolve(theme[fgToken], theme));
  if (!bgRaw || !fgRaw) throw new Error(`unresolved: ${fgToken} on ${bgToken}`);
  const bg = over(bgRaw, page);
  const fg = over(fgRaw, bg);
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/** Every surface a piece of body text can land on. */
const SURFACES = ['bg-canvas', 'bg-base', 'bg-subtle'] as const;
const AA = 4.5;

/**
 * Tokens whose whole job is to be read. Each must clear AA on every surface —
 * "worst case" rather than "usually fine", because a token is chosen at the
 * call site with no idea which card it will end up in.
 */
const TEXT_TOKENS = [
  'text-primary', 'text-secondary', 'text-muted',
  'success-text', 'warning-text', 'danger-text',
];

// --text-disabled is deliberately absent. WCAG 1.4.3 exempts text that is part
// of an inactive control, and raising it would make disabled inputs look
// enabled — the contrast IS the affordance. Adding it here would be scoring a
// point by breaking the thing the guideline protects.

describe.each([['light', LIGHT], ['dark', DARK]] as const)('%s theme', (_name, theme) => {
  it.each(TEXT_TOKENS)('%s clears WCAG AA on every surface', (token) => {
    const failures = SURFACES
      .map((s) => [s, contrast(token, s, theme)] as const)
      .filter(([, r]) => r < AA)
      .map(([s, r]) => `${s}: ${r.toFixed(2)}`);
    expect(failures, `${token} → ${failures.join(', ')}`).toEqual([]);
  });

  it('the primary button label clears AA on the brand fill', () => {
    // Button.tsx is `bg-[var(--brand)] text-white`, in both themes. The most
    // pressed control in the app, so it gets its own check rather than riding
    // on the token sweep.
    const brand = parse(resolve(theme.brand, theme))!;
    const white: RGBA = [255, 255, 255, 1];
    const [hi, lo] = [luminance(white), luminance(brand)].sort((a, b) => b - a);
    expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(AA);
  });
});

describe('the status tokens stay out of text', () => {
  // --success / --warning / --danger are the 500 tone: a FILL. They are correct
  // for dots, bars, borders and icon chips, and unreadable as body text. The
  // -text variants exist for that, and this is what stops the next call site
  // reaching for the wrong one — which is how it happened the first time.
  //
  // The check scans the whole VALUE of a colour property, not just the token
  // immediately after the colon. The first version of it did the latter, and
  // was vacuous: `color: invalid ? 'var(--danger)' : 'var(--text-muted)'` is
  // the most common shape in this codebase and it matched none of them. It was
  // caught by reverting a real call site and watching the test still pass.
  //
  // What it still cannot see is indirection — `const tone = 'var(--danger)'`
  // used as a colour three lines later. Those were migrated by hand and are
  // listed in the commit; no static check can catch the general case.
  // (?<![-\w]) not \b: a hyphen is a word boundary, so \bcolor matches inside
  // `border-color`. The migration that introduced the -text tokens used \b and
  // duly rewrote a border to a text tone; this pattern would have flagged the
  // same line as an offender for the same wrong reason.
  const PROPS = /(?<![-\w])(?:color|WebkitTextFillColor|caretColor)\s*:\s*/g;
  const FILL_TOKEN = /var\(--(?:success|warning|danger)\)/;

  /** The value of a colour property: up to the comma that closes it at depth 0. */
  function colourValues(line: string): string[] {
    const out: string[] = [];
    PROPS.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PROPS.exec(line))) {
      const start = m.index + m[0].length;
      let depth = 0;
      let end = line.length;
      for (let j = start; j < line.length; j++) {
        const c = line[j];
        if ('([{'.includes(c)) depth++;
        else if (')]}'.includes(c)) { if (depth === 0) { end = j; break; } depth--; }
        else if (c === ',' && depth === 0) { end = j; break; }
      }
      out.push(line.slice(start, end));
    }
    return out;
  }

  function sources(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== '__tests__') sources(p, out); continue; }
      if (/\.(tsx?|css)$/.test(e.name)) out.push(p);
    }
    return out;
  }

  // Walked and read once: ~700 files, and doing it per-test blew the default
  // 5s timeout.
  const FILES = sources(join(process.cwd(), 'src'));
  const offenders: string[] = [];
  for (const f of FILES) {
    const rel = f.replace(`${process.cwd()}/`, '');
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (colourValues(line).some((v) => FILL_TOKEN.test(v))) offenders.push(`${rel}:${i + 1}`);
    });
  }

  it('never sets one as a colour', () => {
    expect(offenders).toEqual([]);
  });

  it('found the files, so this cannot pass vacuously', () => {
    expect(FILES.length).toBeGreaterThan(200);
  });

  it('would catch a token inside a ternary, which is the shape that occurs', () => {
    // Pins the fix above rather than trusting it: the vacuous version returned
    // nothing for exactly this line.
    const line = "        style={{ color: invalid ? 'var(--danger)' : 'var(--text-muted)' }}>";
    expect(colourValues(line).some((v) => FILL_TOKEN.test(v))).toBe(true);
  });

  it('does not flag a fill, or the -text variants', () => {
    expect(colourValues("style={{ background: 'var(--danger)' }}")).toEqual([]);
    // border-color is a fill. \bcolor matches inside it; (?<![-\w])color does not.
    expect(colourValues('.x { border-color: var(--danger); }')).toEqual([]);
    expect(colourValues('.x { background-color: var(--danger); }')).toEqual([]);
    const ok = "style={{ color: bad ? 'var(--danger-text)' : 'var(--success-text)' }}";
    expect(colourValues(ok).some((v) => FILL_TOKEN.test(v))).toBe(false);
  });
});
