// The drawer footer has to be readable, and "readable" is a number.
//
// Profile, Settings and Logout were reported as invisible. They were: the
// mobile drawer's background is a gradient ending at #0050AD, and the three
// controls sat on that blue end at rgba(255,255,255,0.42) and
// rgba(239,68,68,0.48) — 2.59:1, 2.59:1 and 1.09:1. WCAG AA wants 4.5:1 for
// text this size. The logout icon at 1.09:1 was very nearly the same colour
// as the background it was drawn on.
//
// The compounding mistake was that contrast was recovered on onMouseEnter.
// This is the MOBILE navigation drawer. A touch device never fires hover, so
// on the only screens where these render they sat at their faintest value
// permanently — the hover state was decoration for a device that was not
// there.
//
// Contrast is computable, so it is asserted rather than eyeballed. Anyone who
// changes one of these values to something better-looking gets told the
// number, not a code review opinion.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FOOTER_COLORS } from '@/components/sidebar/Sidebar';

/**
 * The footer's JSX — starting AFTER its explanatory comment.
 *
 * That comment describes why onMouseEnter was the wrong tool here, so a
 * substring search over a slice that included it would find the explanation
 * rather than a handler. The slice therefore begins at the comment's closing
 * delimiter; a line-prefix filter does not work, because the interior lines of
 * a JSX block comment are plain indented prose.
 */
function footerCode(): string {
  const src = readFileSync(join(process.cwd(), 'src/components/sidebar/Sidebar.tsx'), 'utf8');
  const marker = src.indexOf('Profile | Settings | Logout');
  expect(marker).toBeGreaterThan(-1);
  const codeStart = src.indexOf('*/}', marker);
  expect(codeStart).toBeGreaterThan(marker);
  return src.slice(codeStart, codeStart + 1800);
}

type RGB = [number, number, number];

/** WCAG 2.1 relative luminance. */
function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg: RGB, bg: RGB): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/** '#RRGGBB' or 'rgba(r,g,b,a)' → channels plus alpha. */
function parse(c: string): { rgb: RGB; a: number } {
  if (c.startsWith('#')) {
    return { rgb: [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as RGB, a: 1 };
  }
  const n = c.match(/[\d.]+/g)!.map(Number);
  return { rgb: [n[0], n[1], n[2]], a: n[3] ?? 1 };
}

/** A translucent colour resolved against what is behind it. */
function flatten(c: string, behind: RGB): RGB {
  const { rgb, a } = parse(c);
  return rgb.map((v, i) => Math.round(v * a + behind[i] * (1 - a))) as RGB;
}

const AA = 4.5;
const ground = parse(FOOTER_COLORS.drawerGround).rgb;

describe('the drawer footer clears AA on the worst part of the gradient', () => {
  // Every pairing is measured against #0050AD, the bottom of the drawer's
  // gradient. The top (#0F172A) is far darker and every light foreground only
  // improves there, so passing here passes everywhere.
  const cases: Array<[string, string, string | null]> = [
    ['Profile label', FOOTER_COLORS.neutralFore, FOOTER_COLORS.neutralFill],
    ['Settings icon', FOOTER_COLORS.neutralFore, FOOTER_COLORS.neutralFill],
    ['Logout icon', FOOTER_COLORS.dangerFore, FOOTER_COLORS.dangerFill],
    // Sits straight on the drawer, with no button fill under it.
    ['Email address', FOOTER_COLORS.emailFore, null],
  ];

  it.each(cases)('%s is legible', (_label, fore, fill) => {
    const behind = fill ? flatten(fill, ground) : ground;
    expect(contrast(flatten(fore, behind), behind)).toBeGreaterThanOrEqual(AA);
  });

  it('rejects the values that caused the report', () => {
    // Guards the maths itself: if `contrast` were wrong in a way that made
    // everything pass, the assertions above would be worthless. These are the
    // exact values that shipped, and they must still measure as failures.
    const neutral = flatten(FOOTER_COLORS.neutralFill, ground);
    expect(contrast(flatten('rgba(255,255,255,0.42)', neutral), neutral)).toBeLessThan(AA);
    expect(contrast(flatten('rgba(239,68,68,0.48)', ground), ground)).toBeLessThan(2);
  });
});

describe('red on blue', () => {
  it('is why the logout icon is pale rather than a strong red', () => {
    // The instinct is a vivid red for a destructive action. On this ground it
    // is unreadable — the darker the red, the closer to the blue's luminance.
    // red[200] is the first step that clears AA, so the danger signal comes
    // from the tinted fill and border, not from the icon's own colour.
    const fill = flatten(FOOTER_COLORS.dangerFill, ground);
    for (const tooDark of ['#EF4444', '#DC2626', '#F87171']) {
      expect(contrast(flatten(tooDark, fill), fill)).toBeLessThan(AA);
    }
    expect(contrast(flatten(FOOTER_COLORS.dangerFore, fill), fill)).toBeGreaterThanOrEqual(AA);
  });
});

describe('hover is an enhancement, not the only readable state', () => {
  it('does not restore contrast with mouse handlers', () => {
    // The original recovered legibility in onMouseEnter/onMouseLeave, which a
    // phone never fires. Hover now lives in CSS over an already-legible base.
    const footer = footerCode();
    expect(footer).not.toContain('onMouseEnter');
    expect(footer).not.toContain('onMouseLeave');
    expect(footer).toContain('hover:');
  });

  it('gives every control a 44px target', () => {
    // They were roughly 24px. Set in pixels because a 14px root makes every
    // rem-based size land at 87.5% of its name.
    expect(footerCode().match(/height: 44/g) ?? []).toHaveLength(3);
  });
});
