/**
 * `type="number"` is gone from the tree, and this is what keeps it gone.
 *
 * ── Why it is a data-integrity defect, not a styling preference ─────────────
 *
 * A scroll wheel over a FOCUSED number input silently changes its value. On
 * these screens the value is a body measurement — a waist circumference, a
 * blood pressure, a weekly weigh-in, a 1RM that becomes a
 * "Novice / Intermediate / Advanced" label about a person. The user scrolls
 * the page, the number moves, and afterwards nothing distinguishes it from a
 * figure that was typed.
 *
 * It is the same class as `Number('')` becoming `0`: a value nobody chose,
 * indistinguishable later from one they did.
 *
 * `type="number"` also accepts 'e' and '+' in Safari and reports
 * `valueAsNumber` as NaN for partial input, so it was never the guarantee it
 * looked like. What it did give for free — refusing letters — is replicated by
 * `clampNumericText`, so nothing was traded away.
 *
 * ── Why this is a source scan and not a component test ──────────────────────
 *
 * Three shared components (`FloatInput`, `TextInput`, and the two trainer
 * wrappers) now refuse to render it, so the defect cannot reach the DOM
 * through them. A raw `<input type="number">` anywhere else would still be a
 * hazard, and would still pass every component test. This scan is what closes
 * that door.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '__tests__') walk(p, out); }
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/**
 * Remove `//` and block comments before scanning.
 *
 * Several files explain in prose why `type="number"` is avoided, and counting
 * those as uses of it would be an inflated metric — which is as wrong as a
 * gamed one, and would push someone to delete the explanation to get green.
 */
function stripComments(src: string): string {
  let out = '';
  for (let i = 0; i < src.length;) {
    if (src[i] === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; }
    else if (src[i] === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
    } else { out += src[i]; i++; }
  }
  return out;
}

function hazards(): string[] {
  const found: string[] = [];
  for (const file of walk(SRC)) {
    const code = stripComments(readFileSync(file, 'utf8'));
    if (/type="number"/.test(code) || /type=\{'number'\}/.test(code)) {
      found.push(relative(SRC, file).replace(/\\/g, '/'));
    }
  }
  return found.sort();
}

describe('the scroll-wheel hazard', () => {
  it('appears nowhere in the tree', () => {
    // An invariant, not a ceiling. Reaching zero means a new one has to be
    // argued for in a diff rather than absorbed into a budget.
    expect(hazards()).toEqual([]);
  });

  it('scanned a real tree, not an empty one', () => {
    // A check that passes because nothing was read is not a check.
    expect(walk(SRC).length).toBeGreaterThan(200);
  });
});

describe('the components that make it unreachable', () => {
  const read = (...p: string[]) => readFileSync(join(SRC, ...p), 'utf8');

  it('FloatInput maps a numeric type to text', () => {
    const src = read('components', 'ui', 'FloatInput.tsx');
    expect(src).toMatch(/NUMERIC_TYPES/);
    expect(src).toMatch(/renderedType/);
  });

  it('TextInput does the same, so no call site can reintroduce it', () => {
    const src = read('components', 'ui', 'form', 'controls.tsx');
    expect(src).toMatch(/type === 'number'/);
    expect(src).toMatch(/numeric \? 'text' : type/);
  });

  it('there is ONE clamp implementation, exported and reused', () => {
    // A second copy is how two fields end up disagreeing about whether a
    // decimal point is allowed.
    const src = read('components', 'ui', 'FloatInput.tsx');
    expect(src).toMatch(/export function clampNumericText/);
  });
});
