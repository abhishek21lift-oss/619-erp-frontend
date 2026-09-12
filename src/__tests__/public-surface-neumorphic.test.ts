// The signed-out surface: one soft light material, and legible on it.
//
// The marketing site, Start Free, the three sign-in doors and password
// recovery used to sit on a near-black navy canvas. They are now soft-UI: one
// light base, elements made of that same base, told apart by how the light
// falls on them rather than by being a different colour.
//
// ── Why this file exists ──────────────────────────────────────────────────
//
// Neumorphism's standard failure is contrast. Everything is one colour, so
// everything is one colour to anyone who cannot see a 4% luminance step — and
// the failure is invisible to the person choosing the colours, because they
// can see it fine. During this conversion the same mistake shipped twice, both
// times from picking a value by eye:
//
//   · the emerald and saffron accents were kept at their dark-canvas
//     brightness, where they measured 1.7:1 and 3.8:1 on the light base
//   · `inkOn` was written with a 0.45 luminance threshold, and saffron
//     measures 0.4308 — so the helper returned white for the exact colour it
//     was added to catch, and the page still failed
//
// Neither was caught by reading the diff. Both were caught by measuring. So
// the measurement is the test.

import { describe, expect, it } from 'vitest';
import { C, SHADOW, HEADER, inkOn } from '@/components/landing/tokens';

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const lin = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('the surface is light, and one material', () => {
  it('is a light base, not the near-black navy it replaced', () => {
    // The canvas this replaced was a near-black navy, luminance about 0.013.
    // Anything that dark here means a token was reverted or a merge brought
    // the old file back. The old value is described rather than quoted: it is
    // outside the five palette families, and palette.test.ts scans every file
    // in src/ for exactly that — including this one, which is how the first
    // draft of this comment failed a guard about colour decay by explaining
    // colour decay.
    expect(luminance(C.canvas)).toBeGreaterThan(0.6);
    expect(luminance(C.canvasAlt)).toBeGreaterThan(0.6);
  });

  it('makes a panel the SAME colour as the page', () => {
    // The premise of soft UI, and the thing most likely to be "fixed" by
    // somebody who sees two identical values and assumes it is a typo. A
    // raised card is not a lighter box on a darker page — there is no lighter
    // box. It is the page, pushed out, and SHADOW is what pushes it.
    expect(C.panel).toBe(C.canvas);
  });

  it('carries the elevation in paired shadows rather than in the fill', () => {
    // Every raised token is the same two-light model: white up-left, grey
    // down-right. One of the pair missing is a flat drop shadow wearing the
    // name of a soft one.
    for (const [name, value] of Object.entries(SHADOW)) {
      if (name === 'blueGlow') continue; // the CTA's halo is colour, not light
      expect(value, `SHADOW.${name} highlight`).toContain('rgba(255,255,255');
      expect(value, `SHADOW.${name} shade`).toContain('rgba(174,184,202');
    }
    expect(SHADOW.inset.startsWith('inset')).toBe(true);
  });

  it('lifts the header off the page instead of darkening it', () => {
    const bar = HEADER.bg.match(/[\d.]+/g)!.map(Number);
    expect(bar[0]).toBeGreaterThan(200);
    expect(bar[1]).toBeGreaterThan(200);
    expect(bar[2]).toBeGreaterThan(200);
  });
});

describe('every text token is legible on every surface it lands on', () => {
  // Captions sit on panelAlt as often as on canvas, and panelAlt is a
  // half-step darker. Checking only against canvas is how `faint` shipped at
  // 4.34:1 — it passed at 4.63:1 against the tone it was measured on, and the
  // tone it was measured on was not the one it sits on.
  const SURFACES: Array<[string, string]> = [
    ['canvas', C.canvas],
    ['canvasAlt', C.canvasAlt],
    ['panelAlt', C.panelAlt],
  ];
  const TEXT: Array<[string, string]> = [
    ['ink', C.ink],
    ['body', C.body],
    ['muted', C.muted],
    ['faint', C.faint],
    ['blueHi', C.blueHi],
    ['goldHi', C.goldHi],
    ['emerald', C.emerald],
    ['red', C.red],
  ];

  it.each(TEXT)('%s clears 4.5:1 on every surface', (name, colour) => {
    for (const [surfaceName, surface] of SURFACES) {
      const ratio = contrast(colour, surface);
      expect(
        { token: name, on: surfaceName, ratio: Number(ratio.toFixed(2)) },
        `${name} on ${surfaceName}`,
      ).toEqual({ token: name, on: surfaceName, ratio: expect.any(Number) });
      expect(ratio, `${name} on ${surfaceName}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the primary action a filled button, not an extruded ghost', () => {
    // The one place this surface refuses to be purely neumorphic. A studio's
    // "Start free trial" must not be a shape you have to find.
    expect(contrast('#ffffff', C.blue)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', C.blueLo)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('inkOn picks the readable ink for a fill', () => {
  it('puts dark ink on saffron, where white measures 2.15:1', () => {
    // The bug this helper exists for, and the one its first version still had.
    expect(inkOn(C.gold)).toBe(C.onGold);
    expect(contrast(inkOn(C.gold), C.gold)).toBeGreaterThanOrEqual(4.5);
  });

  it('puts white on the dark fills', () => {
    for (const fill of [C.blue, C.blueLo, C.blueHi, C.emerald, C.red]) {
      expect(inkOn(fill)).toBe('#fff');
      expect(contrast('#ffffff', fill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('returns the better of the two for any fill, not a thresholded guess', () => {
    // A threshold is a guess about where the crossover sits, and the guess was
    // wrong by 0.02 — which is the whole distance between a working helper and
    // one that returns white for saffron. Swept across the greys: whatever it
    // returns must be at least as good as the alternative, everywhere.
    for (let v = 0; v <= 255; v += 5) {
      const fill = '#' + v.toString(16).padStart(2, '0').repeat(3);
      const chosen = inkOn(fill);
      const other = chosen === '#fff' ? C.onGold : '#ffffff';
      expect(
        contrast(chosen, fill) >= contrast(other, fill),
        `inkOn(${fill}) chose ${chosen} (${contrast(chosen, fill).toFixed(2)}:1) over ${other} (${contrast(other, fill).toFixed(2)}:1)`,
      ).toBe(true);
    }
  });
});
