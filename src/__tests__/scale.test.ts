// The type and radius scales, and a floor under how far they can drift.
//
// The app declares 4,200 font sizes across 40 distinct values and 1,940 radii
// across 29. Neither is a "scale" in the design-system sense, and collapsing
// them to nine steps was considered and rejected: at 1,250 half-pixel call
// sites that is a visual redesign of every screen, not a cleanup.
//
// What was actually wrong is narrower. Three sub-pixel sizes were outliers by
// any reading of the numbers — 15.5px used 4 times, 8.5px 8 times, 14.5px 20
// times, against a clean gap up to 9.5px's 53. Those are gone. The remaining
// half-steps (9.5 · 10.5 · 11.5 · 12.5 · 13.5, 1,218 uses between them) are a
// deliberate half-step ladder, not rounding debris: at the 2x and 3x device
// pixel ratios every phone running this app has, 12.5px is exactly 25 and 37
// device pixels. Collapsing them would move type on essentially every screen.
//
// So this file does two things: it stops NEW sub-pixel values appearing
// outside that ladder, and it keeps the distinct-value counts from growing.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/** The half-step ladder that is deliberate and stays. Nothing may be added. */
const LADDER = new Set([9.5, 10.5, 11.5, 12.5, 13.5]);

interface Use { value: number; at: string }

function scan(): { sizes: Use[]; radii: Use[] } {
  const sizes: Use[] = [];
  const radii: Use[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (!['node_modules', '__tests__'].includes(e.name)) walk(p); continue; }
      if (!/\.(tsx?|css)$/.test(e.name)) continue;
      const rel = relative(process.cwd(), p).replace(/\\/g, '/');
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        const at = `${rel}:${i + 1}`;
        // Tailwind arbitrary values, inline style objects (unitless numbers,
        // which React renders as px), and plain CSS — the three ways this app
        // spells a size.
        const push = (out: Use[], re: RegExp) => {
          for (const m of line.matchAll(re)) out.push({ value: Number(m[1]), at });
        };
        push(sizes, /text-\[(\d+(?:\.\d+)?)px\]/g);
        push(sizes, /fontSize:\s*(\d+(?:\.\d+)?)(?![\d.])/g);
        push(sizes, /fontSize:\s*['"`](\d+(?:\.\d+)?)px/g);
        push(sizes, /font-size:\s*(\d+(?:\.\d+)?)px/g);
        push(radii, /rounded-\[(\d+(?:\.\d+)?)px\]/g);
        push(radii, /borderRadius:\s*(\d+(?:\.\d+)?)(?![\d.])/g);
        push(radii, /border-radius:\s*(\d+(?:\.\d+)?)px/g);
      });
    }
  };
  walk(join(process.cwd(), 'src'));
  return { sizes, radii };
}

const { sizes, radii } = scan();
const distinct = (u: Use[]) => new Set(u.map((x) => x.value));
const subPixel = (u: Use[]) => u.filter((x) => !Number.isInteger(x.value));

describe('the audit found the app it is auditing', () => {
  // Every threshold below is meaningless if the scan silently stops matching.
  it('scanned a plausible number of declarations', () => {
    expect(sizes.length).toBeGreaterThan(4000);
    expect(radii.length).toBeGreaterThan(1800);
  });
});

describe('font sizes', () => {
  it('uses no sub-pixel value outside the half-step ladder', () => {
    const stray = subPixel(sizes).filter((x) => !LADDER.has(x.value));
    expect(
      stray.map((x) => `${x.value}px at ${x.at}`),
      'a new sub-pixel size — use the nearest whole step, or the ladder',
    ).toEqual([]);
  });

  it('has not grown past 40 distinct values', () => {
    // A ratchet in one direction. It was 43; collapsing 15.5 → 15, 8.5 → 9 and
    // 14.5 → 14 took out three. Lower it when more go, never raise it.
    expect(distinct(sizes).size).toBeLessThanOrEqual(40);
  });

  it('kept the three outliers gone', () => {
    for (const gone of [15.5, 8.5, 14.5]) {
      expect(sizes.filter((x) => x.value === gone).map((x) => x.at)).toEqual([]);
    }
  });

  it('kept the ladder itself, which was deliberately not collapsed', () => {
    // Guards the other direction: someone "finishing the job" would take out
    // 1,218 call sites and move type on every screen in the app.
    for (const step of LADDER) {
      expect(sizes.filter((x) => x.value === step).length, `${step}px vanished`)
        .toBeGreaterThan(40);
    }
  });
});

describe('radii', () => {
  it('are whole pixels, every one of them', () => {
    // They already were — the radius scale had no sub-pixel values at all, so
    // there was nothing to collapse. This keeps it that way.
    expect(subPixel(radii).map((x) => `${x.value}px at ${x.at}`)).toEqual([]);
  });

  it('has not grown past 29 distinct values', () => {
    expect(distinct(radii).size).toBeLessThanOrEqual(29);
  });
});
