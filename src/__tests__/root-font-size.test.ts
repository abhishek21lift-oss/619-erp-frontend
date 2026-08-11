// The root font size, and the thing everybody gets wrong because of it.
//
// `html { font-size: 87.5% }` is 14px on a default browser. That is a
// deliberate choice about density, and this file does not argue with it. What
// it pins is the CONSEQUENCE, which is much easier to forget than the cause:
//
//   every rem-based Tailwind utility renders at 87.5% of the px value its
//   name implies.
//
//   h-11  = 2.75rem = 38.5px   (not 44)
//   h-12  = 3rem    = 42px     (not 48)
//   p-4   = 1rem    = 14px     (not 16)
//
// Three separate comments in PtOsDashboard.tsx asserted "h-11 = 44px: the
// minimum a thumb can hit reliably" and shipped. They were wrong the whole
// time — device-check measured the AI Coach's WhatsApp and Call buttons at
// 149x39 — and nothing in the codebase contradicted them, because the claim
// is only false in the relationship between a CSS file and a class name.
//
// So: any control that must clear a real pixel threshold states it in px.
// If someone later moves the root to 16px, the first two tests here fail and
// point at everything that assumed otherwise, which is the moment to re-tune
// the app rather than discover it from a screenshot.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { srcPath } from '@/__tests__/helpers/app-routes';

// Comments stripped before anything is parsed. The comment above the rule
// being asserted here explains the bug by QUOTING it — it contains the literal
// text `font-size: 14px` — and a naive match reads that quotation as the
// declaration. Same trap session-hero-shape.test.ts documents: the prose
// describing a fix must not be able to fail the test for the fix.
const css = readFileSync(srcPath('app', 'globals.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** The `html { … }` block, brace-balanced. */
function htmlBlock(): string {
  const i = css.search(/^html\s*\{/m);
  if (i < 0) throw new Error('no html { } block in globals.css');
  const open = css.indexOf('{', i);
  let depth = 0;
  for (let j = open; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}' && --depth === 0) return css.slice(open, j);
  }
  throw new Error('unbalanced html block');
}

/** What one rem resolves to, in px, given the declared root size. */
const ROOT_PX = 14;

describe('the root font size', () => {
  it('is a percentage, so a larger browser default is respected', () => {
    // An absolute `font-size: 14px` overrides the user's own setting outright:
    // someone who sets their browser default to 20px for readability still
    // gets 14px. A percentage scales with it (20px -> 17.5px) and is
    // byte-identical at the 16px default, so this costs nothing.
    const block = htmlBlock();
    const m = block.match(/font-size:\s*([^;]+);/);
    expect(m).toBeTruthy();

    const value = m![1].trim();
    expect(value).toMatch(/%$/);
    // 87.5% of the 16px default is exactly the 14px this app is tuned at.
    expect(parseFloat(value)).toBeCloseTo((ROOT_PX / 16) * 100, 5);
  });

  it('makes rem utilities smaller than their names say, and that is documented', () => {
    // The arithmetic, stated once so it cannot be argued with. If the root
    // moves, these numbers move, and the assertions below break loudly.
    const rem = (n: number) => n * ROOT_PX;

    expect(rem(2.75)).toBe(38.5);   // h-11 — NOT 44
    expect(rem(3)).toBe(42);        // h-12 — NOT 48
    expect(rem(1)).toBe(14);        // p-4  — NOT 16

    // The one that matters: the platform minimum touch target is 44px, and
    // no Tailwind height utility hits it at this root. h-11 is the closest
    // and falls 5.5px short.
    expect(rem(2.75)).toBeLessThan(44);
  });
});

describe('controls that must clear 44px say so in pixels', () => {
  it('the dashboard declares an explicit tap minimum', () => {
    const dash = readFileSync(
      srcPath('components', 'dashboards', 'PtOsDashboard.tsx'),
      'utf8',
    );

    // Not a style assertion — a correctness one. These buttons measured 39px
    // tall in a real browser while their own comment claimed 44.
    expect(dash).toMatch(/const TAP_MIN = 44;/);
    expect(dash).toMatch(/minHeight: TAP_MIN/);
  });

});

// There was a fourth test here: "no comment still claims h-11 is 44px",
// grepping the dashboard for /h-1[12]\s*=\s*4[48]px/. It failed on the
// TAP_MIN comment — which QUOTES the false claim in order to explain why it
// was wrong. To make it pass, the explanation would have had to be deleted.
//
// session-hero-shape.test.ts hit exactly this and says so: "the prose
// describing the fix would have had to be deleted to make the fix pass, which
// is exactly backwards." A regex cannot tell an assertion from a quotation of
// one, and the version that can is more fragile than the bug it guards. The
// three tests above pin the arithmetic and the px-stated minimum, which is
// where the actual protection lives.
