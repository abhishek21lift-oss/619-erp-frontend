// The public surface: one light system, and legible on it.
//
// The marketing site, Start Free, the three sign-in doors and password
// recovery share one visual language: a white page, a grey band for rhythm, a
// near-black ink, one action blue, and real drop shadows. Colour is spent where
// it carries meaning, not on elevation.
//
// ── Why this file exists ──────────────────────────────────────────────────
//
// The failure mode of a light system is contrast: a muted caption and a blue
// button both look fine and can measure below 4.5:1. Two values in this system
// were caught that way, not by reading the diff — `faint` shipped at 4.33:1 on
// the grey band, and the hover blue carried white at 4.32:1. So the
// measurement is the test.

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

describe('the surface is light and flat', () => {
  it('starts from a white page and a grey band, not a dark canvas', () => {
    expect(luminance(C.canvas)).toBeGreaterThan(0.9);
    expect(luminance(C.canvasAlt)).toBeGreaterThan(0.6);
    // The band has to be visibly darker than the page, or section rhythm
    // disappears and every block runs together.
    expect(luminance(C.canvasAlt)).toBeLessThan(luminance(C.canvas));
  });

  it('puts white cards on the grey band', () => {
    // Separation is fill + shadow now, not a single soft material. A card that
    // is not lighter than the band it sits on reads as a hole in the page.
    expect(C.panel).toBe(C.canvas);
    expect(luminance(C.panel)).toBeGreaterThan(luminance(C.canvasAlt));
  });

  it('carries elevation in a real drop shadow, not a paired light', () => {
    // Neumorphism drew two lights: white up-left, grey down-right. A single
    // dark shadow is intentional here. A white highlight creeping back in means
    // the old material was restored.
    for (const [name, value] of Object.entries(SHADOW)) {
      if (name === 'blueGlow') continue; // the CTA's halo is colour, not light
      expect(value, `SHADOW.${name}`).toContain('rgba(0,0,0');
      expect(value, `SHADOW.${name}`).not.toContain('rgba(255,255,255');
    }
    expect(SHADOW.inset.startsWith('inset')).toBe(true);
  });

  it('keeps the header translucent white over the page', () => {
    const [r, g, b, a] = HEADER.bg.match(/[\d.]+/g)!.map(Number);
    expect(Math.min(r, g, b)).toBeGreaterThan(200);
    expect(a).toBeLessThan(1);
  });
});

describe('every text token is legible on every surface it lands on', () => {
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
      expect(ratio, `${name} on ${surfaceName}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('the primary action is a filled blue button', () => {
  it('carries white at 4.5:1', () => {
    // "Start free" must not be a tinted ghost you have to find.
    expect(contrast('#ffffff', C.blue)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('inkOn picks the readable ink for a fill', () => {
  it('puts dark ink on saffron, where white measures 2.2:1', () => {
    // The bug this helper exists for, and the one its first version still had.
    expect(inkOn(C.gold)).toBe(C.onGold);
    expect(contrast(inkOn(C.gold), C.gold)).toBeGreaterThanOrEqual(4.5);
  });

  it('puts white on the dark fills', () => {
    for (const fill of [C.blue, C.blueHi, C.emerald, C.red]) {
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
