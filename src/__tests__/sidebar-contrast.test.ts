// The whole sidebar has to be readable, not just its footer.
//
// Fixing the footer's three buttons left the navigation above them wrong in
// exactly the same way, and for exactly the same reason: the drawer's
// background is a gradient, near-black at the top and brand blue from 65%
// down, and every foreground had been chosen against the dark end. Measured
// against the light end — where the expanded sub-items and the chevrons
// actually sit:
//
//   section label   1.65:1        nav icon    2.37:1
//   chevron         1.89:1        nav label   3.20:1
//   rail icon       1.98:1        active      3.59:1
//
// AA wants 4.5:1. Four of those failed against the DARK end too, so they were
// never adequate; the blue only made it visible.
//
// The fix darkened the blue end rather than only lifting the foregrounds. That
// is the part worth guarding: raising alphas fixes the values that exist
// today, while making the surface behave like a dark surface means the next
// thing added to this file inherits a ground that works.
import { describe, expect, it } from 'vitest';
import { SIDEBAR_GROUNDS, SIDEBAR_FOREGROUNDS } from '@/components/sidebar/Sidebar';

type RGB = [number, number, number];

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

function parse(c: string): { rgb: RGB; a: number } {
  if (c.startsWith('#')) {
    return { rgb: [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as RGB, a: 1 };
  }
  const n = c.match(/[\d.]+/g)!.map(Number);
  return { rgb: [n[0], n[1], n[2]], a: n[3] ?? 1 };
}

function flatten(c: string, behind: RGB): RGB {
  const { rgb, a } = parse(c);
  return rgb.map((v, i) => Math.round(v * a + behind[i] * (1 - a))) as RGB;
}

const AA = 4.5;
const DARK = parse(SIDEBAR_GROUNDS.dark).rgb;
const BLUE = parse(SIDEBAR_GROUNDS.blue).rgb;

describe('every sidebar foreground clears AA on both ends of the gradient', () => {
  const entries = Object.entries(SIDEBAR_FOREGROUNDS);

  it('covers every foreground the sidebar declares', () => {
    // Guards the guard: an exported value that nothing measures is a value
    // that can drift back to invisible.
    expect(entries.length).toBeGreaterThanOrEqual(5);
  });

  it.each(entries)('%s is legible on the dark end', (_name, colour) => {
    expect(contrast(flatten(colour, DARK), DARK)).toBeGreaterThanOrEqual(AA);
  });

  it.each(entries)('%s is legible on the blue end', (_name, colour) => {
    // This is the one that was failing. The lower half of an expanded drawer
    // is entirely on this ground.
    expect(contrast(flatten(colour, BLUE), BLUE)).toBeGreaterThanOrEqual(AA);
  });
});

describe('the ground itself', () => {
  it('is dark enough to behave like a dark surface', () => {
    // #0050AD was bright enough that white at 52% — a perfectly ordinary
    // value on a dark navigation — came out at 3.20:1. The blue end is now
    // dark enough that ordinary values work, which is what stops this
    // recurring every time something is added to the file.
    const white52 = flatten('rgba(255,255,255,0.52)', BLUE);
    expect(contrast(white52, BLUE)).toBeGreaterThanOrEqual(AA);
  });

  it('still fails against the blue that shipped', () => {
    // Guards the maths. If `contrast` were wrong in a way that made
    // everything pass, every assertion above would be worthless.
    const OLD: RGB = [0x00, 0x50, 0xAD];
    expect(contrast(flatten('rgba(255,255,255,0.52)', OLD), OLD)).toBeLessThan(AA);
    expect(contrast(flatten('rgba(255,255,255,0.28)', OLD), OLD)).toBeLessThan(2);
  });

  it('is still recognisably blue, not a neutral dark', () => {
    // The gradient is brand identity. Darkening it to pass contrast must not
    // turn it grey — blue has to stay the dominant channel by a clear margin.
    const [r, g, b] = BLUE;
    expect(b).toBeGreaterThan(g);
    expect(b).toBeGreaterThan(r);
    expect(b - Math.max(r, g)).toBeGreaterThan(40);
  });
});
