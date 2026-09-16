/**
 * Numbers in a control that saves on blur.
 *
 * A form's schema can answer "valid" or "invalid" and block the submit. A
 * per-blur editor cannot block anything — the blur has already happened — so
 * it needs a third answer, and getting that wrong CLEARS data rather than
 * refusing it.
 */

import { describe, it, expect } from 'vitest';
import { inlineNumber, stepFrom } from '../lib/forms/inline';

describe('inlineNumber — three outcomes', () => {
  it('returns null for an empty box, meaning "clear the stored value"', () => {
    expect(inlineNumber('')).toBeNull();
    expect(inlineNumber('   ')).toBeNull();
  });

  it('returns the number for a real figure', () => {
    expect(inlineNumber('80')).toBe(80);
    expect(inlineNumber('82.5')).toBe(82.5);
    expect(inlineNumber('0')).toBe(0);
  });

  it('reads what a trainer actually types, separators and all', () => {
    expect(inlineNumber('1,500')).toBe(1500);
    expect(inlineNumber(' 82.5 ')).toBe(82.5);
  });

  it('returns undefined for something unparseable — save NOTHING', () => {
    // This is the outcome the whole helper exists for. `Number('12kg')` is
    // NaN, NaN serialises to null over JSON, and saving null CLEARS the logged
    // weight — because the trainer typed a unit after the figure.
    expect(inlineNumber('12kg')).toBeUndefined();
    expect(inlineNumber('abc')).toBeUndefined();
    expect(inlineNumber('8-12')).toBeUndefined();
    expect(inlineNumber('--')).toBeUndefined();
  });

  it('never returns NaN, whatever it is given', () => {
    for (const raw of ['', ' ', '80', '12kg', 'Infinity', '1e999', '0x10', '-', '.']) {
      const v = inlineNumber(raw);
      expect(typeof v === 'number' && Number.isNaN(v)).toBe(false);
    }
  });

  it('refuses Infinity, which JSON would send as null', () => {
    expect(inlineNumber('Infinity')).toBeUndefined();
    expect(inlineNumber('1e999')).toBeUndefined();
  });
});

describe('stepFrom — what a +/- button starts from', () => {
  it('steps an empty box from zero', () => {
    expect(stepFrom('')).toBe(0);
    expect(stepFrom('  ')).toBe(0);
  });

  it('steps a real figure from itself', () => {
    expect(stepFrom('80')).toBe(80);
    expect(stepFrom('82.5')).toBe(82.5);
  });

  it('refuses to step from something unparseable', () => {
    // Without this, `Math.max(0, Math.round(NaN * 2) / 2)` is NaN — written
    // into the box as the string "NaN" and saved as null, clearing the set.
    expect(stepFrom('12kg')).toBeNull();
    expect(stepFrom('abc')).toBeNull();
  });
});
