import { describe, expect, it } from 'vitest';
import {
  PROGRAMME_NAME_MAX, programmeDetailsDefaults, programmeDetailsSchema,
  toProgrammeDetailsPatch,
} from '@/lib/forms/schemas/programmeDetails';

const BASE = {
  name: 'Meet prep',
  goal: 'muscle_gain',
  difficulty: 'intermediate',
  duration_weeks: '12',
};

const parse = (values: Record<string, unknown>, maxWeeks = 52) =>
  programmeDetailsSchema(maxWeeks).safeParse(values);

const message = (result: ReturnType<typeof parse>) =>
  result.success ? null : result.error.issues[0]?.message;

describe('programme details schema', () => {
  it('converts the raw string fields to typed values once', () => {
    const result = parse(BASE);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({
      name: 'Meet prep',
      goal: 'muscle_gain',
      difficulty: 'intermediate',
      duration_weeks: 12,
    });
  });

  it('keeps a missing goal and difficulty absent instead of inventing defaults', () => {
    const result = parse({ ...BASE, goal: '', difficulty: '   ' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.goal).toBeNull();
    expect(result.data.difficulty).toBeNull();
  });

  it('trims text at the boundary', () => {
    const result = parse({ ...BASE, name: '  Meet prep  ', goal: ' strength ' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.name).toBe('Meet prep');
    expect(result.data.goal).toBe('strength');
  });

  it('requires a real name', () => {
    expect(message(parse({ ...BASE, name: '   ' }))).toBe('Programme name is required.');
  });

  it('accepts the name at its ceiling and rejects one character over', () => {
    expect(parse({ ...BASE, name: 'A'.repeat(PROGRAMME_NAME_MAX) }).success).toBe(true);
    expect(message(parse({ ...BASE, name: 'A'.repeat(PROGRAMME_NAME_MAX + 1) })))
      .toBe(`Programme name cannot be more than ${PROGRAMME_NAME_MAX} characters (currently ${PROGRAMME_NAME_MAX + 1}).`);
  });

  it('accepts both ends of the weeks range', () => {
    expect(parse({ ...BASE, duration_weeks: '1' }).success).toBe(true);
    expect(parse({ ...BASE, duration_weeks: '52' }).success).toBe(true);
  });

  it('blocks zero, negative, fractional and oversized weeks', () => {
    expect(message(parse({ ...BASE, duration_weeks: '0' }))).toBe('Weeks must be at least 1.');
    expect(message(parse({ ...BASE, duration_weeks: '-1' }))).toBe('Weeks must be at least 1.');
    expect(message(parse({ ...BASE, duration_weeks: '2.5' }))).toBe('Weeks must be a whole number.');
    expect(message(parse({ ...BASE, duration_weeks: '53' }))).toBe('Weeks cannot be more than 52.');
  });

  it('blocks a blank or unparseable box instead of turning it into one week', () => {
    expect(message(parse({ ...BASE, duration_weeks: '' }))).toBe('Weeks is required.');
    expect(message(parse({ ...BASE, duration_weeks: '   ' }))).toBe('Weeks is required.');
    expect(message(parse({ ...BASE, duration_weeks: 'abc' }))).toBe('Weeks must be a number.');
  });

  it('uses the plan-specific ceiling for a long programme', () => {
    expect(parse({ ...BASE, duration_weeks: '60' }, 60).success).toBe(true);
    expect(message(parse({ ...BASE, duration_weeks: '61' }, 60))).toBe('Weeks cannot be more than 60.');
  });
});

describe('programme details payload', () => {
  const plan = {
    name: 'Meet prep', goal: 'muscle_gain', difficulty: 'intermediate', duration_weeks: 12,
  };

  const values = (overrides: Record<string, unknown> = {}) => {
    const result = programmeDetailsSchema(52).safeParse({ ...BASE, ...overrides });
    if (!result.success) throw result.error;
    return result.data;
  };

  it('sends nothing when nothing changed', () => {
    expect(toProgrammeDetailsPatch(plan, values())).toEqual({});
  });

  it('sends only the fields that changed', () => {
    expect(toProgrammeDetailsPatch(plan, values({
      name: 'Meet Prep', goal: 'strength', duration_weeks: '16',
    }))).toEqual({ name: 'Meet Prep', goal: 'strength', duration_weeks: 16 });
  });

  it('does not invent a goal or difficulty for a bare programme', () => {
    expect(toProgrammeDetailsPatch(
      { ...plan, goal: null, difficulty: null },
      values({ goal: '', difficulty: '' }),
    )).toEqual({});
  });

  it('does not treat trimming a legacy value as an edit', () => {
    expect(toProgrammeDetailsPatch(
      { ...plan, goal: ' strength ' },
      values({ goal: ' strength ' }),
    )).toEqual({});
  });

  it('does not send a cleared goal — the dialog cannot clear one', () => {
    expect(toProgrammeDetailsPatch(plan, values({ goal: '' }))).toEqual({});
  });
});

describe('programme details defaults', () => {
  it('keeps legacy nulls blank and preserves a real length', () => {
    expect(programmeDetailsDefaults({
      name: 'Bare', goal: null, difficulty: null, duration_weeks: 12,
    })).toEqual({
      name: 'Bare', goal: '', difficulty: '', duration_weeks: '12',
    });
  });

  it('uses the old four-week fallback when a length is absent', () => {
    expect(programmeDetailsDefaults({
      name: 'Bare', goal: null, difficulty: null, duration_weeks: null,
    }).duration_weeks).toBe('4');
  });
});
