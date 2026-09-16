/**
 * Logging a lift.
 *
 * Three numbers that become a JUDGEMENT: the Epley 1RM is derived from weight
 * and reps, and classifyStrength turns that into "Novice / Intermediate /
 * Advanced" against population norms. A wrong rep count does not produce a
 * wrong number, it produces a wrong statement about a person.
 */

import { describe, it, expect } from 'vitest';
import {
  strengthLogSchema, blankStrengthLog, type StrengthLogState,
} from '../lib/forms/schemas/strengthLog';

function lift(over: Partial<StrengthLogState> = {}): StrengthLogState {
  return { ...blankStrengthLog(), weight_kg: '80', ...over };
}

function messages(r: ReturnType<typeof strengthLogSchema.safeParse>) {
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

describe('a cleared box is not a default', () => {
  it('refuses blank sets rather than logging three', () => {
    // `parseInt(sets, 10) || 3` logged THREE SETS — a number nobody entered,
    // indistinguishable in the history from one somebody did.
    const r = strengthLogSchema.safeParse(lift({ sets: '' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Sets is required.');
  });

  it('refuses blank reps rather than logging ten', () => {
    // Ten is what the 1RM formula then divides by.
    const r = strengthLogSchema.safeParse(lift({ reps: '   ' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Reps is required.');
  });

  it('refuses a blank weight rather than doing nothing silently', () => {
    // The old guard was `if (!w) return` — the button appeared to work, the
    // panel stayed open, and no lift was recorded.
    const r = strengthLogSchema.safeParse(lift({ weight_kg: '' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Weight is required.');
  });

  it('still OFFERS three sets and ten reps, which is a different thing', () => {
    // A value the form shows and the user can change, as opposed to one
    // substituted after they cleared the box with nothing on screen to say so.
    expect(blankStrengthLog()).toEqual({ weight_kg: '', sets: '3', reps: '10' });
  });
});

describe('parseFloat parsed a prefix; this does not', () => {
  it('refuses "100kg" rather than logging 100', () => {
    const r = strengthLogSchema.safeParse(lift({ weight_kg: '100kg' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Weight must be a number.');
  });

  it('reads a figure typed with a separator', () => {
    expect(strengthLogSchema.safeParse(lift({ weight_kg: '1,00' })).data!.weight_kg).toBe(100);
  });

  it('keeps half-plates', () => {
    expect(strengthLogSchema.safeParse(lift({ weight_kg: '82.5' })).data!.weight_kg).toBe(82.5);
  });
});

describe('the bounds are generous and not open-ended', () => {
  it('accepts a world-record-beating lift', () => {
    // 500 is above every listed record for the lifts this screen tracks, so
    // the bound can never refuse a real one.
    expect(strengthLogSchema.safeParse(lift({ weight_kg: '499' })).success).toBe(true);
  });

  it('refuses the mistyped 5000 that would top every percentile chart', () => {
    const r = strengthLogSchema.safeParse(lift({ weight_kg: '5000' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Weight cannot be more than 500 kg.');
  });

  it('refuses zero and negative weight', () => {
    expect(strengthLogSchema.safeParse(lift({ weight_kg: '0' })).success).toBe(false);
    expect(strengthLogSchema.safeParse(lift({ weight_kg: '-20' })).success).toBe(false);
  });

  it('refuses zero sets or zero reps — that is not a logged lift', () => {
    expect(strengthLogSchema.safeParse(lift({ sets: '0' })).success).toBe(false);
    expect(strengthLogSchema.safeParse(lift({ reps: '0' })).success).toBe(false);
  });

  it('refuses fractional sets and reps rather than rounding them', () => {
    expect(strengthLogSchema.safeParse(lift({ sets: '3.5' })).success).toBe(false);
    expect(strengthLogSchema.safeParse(lift({ reps: '8.5' })).success).toBe(false);
  });
});

describe('a real lift goes through', () => {
  it('parses to numbers, not strings', () => {
    const r = strengthLogSchema.safeParse(lift({ weight_kg: '82.5', sets: '5', reps: '5' }));
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ weight_kg: 82.5, sets: 5, reps: 5 });
  });
});
