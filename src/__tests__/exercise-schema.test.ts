/**
 * The exercise library's editor — the app's largest single form.
 *
 * The defect worth pinning is rest_seconds: a truthiness guard plus
 * `Number.isNaN(Number(x))` let a whitespace string through as ZERO SECONDS of
 * rest, and both the guard and the validator agreed it was fine.
 */

import { describe, it, expect } from 'vitest';
import {
  exerciseSchema, blankExercise, exerciseToFormValues, toExercisePayload,
  isExerciseDraft, DIFFICULTIES, type ExerciseFormState,
} from '../lib/forms/schemas/exercise';

function ex(over: Partial<ExerciseFormState> = {}): ExerciseFormState {
  return {
    ...blankExercise(),
    name: 'Landmine Squat',
    primary_muscle_id: 'muscle-quads',
    ...over,
  };
}

function messages(r: ReturnType<typeof exerciseSchema.safeParse>) {
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

describe('rest_seconds — the field that was silently zero', () => {
  it('refuses a whitespace string rather than prescribing zero rest', () => {
    // `'  '` is truthy, so the old guard ran `Number('  ')` → 0, and the
    // validator beside it tested `Number.isNaN(Number('  '))` → false. Both
    // agreed. The exercise was stored with no rest between sets.
    const r = exerciseSchema.safeParse(ex({ rest_seconds: '  ' }));
    expect(r.success).toBe(true);
    expect(r.data!.rest_seconds).toBeNull();
  });

  it('treats an empty box as "not specified"', () => {
    expect(exerciseSchema.safeParse(ex({ rest_seconds: '' })).data!.rest_seconds).toBeNull();
  });

  it('refuses zero outright — nobody prescribes it', () => {
    const r = exerciseSchema.safeParse(ex({ rest_seconds: '0' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Rest must be at least 5 seconds.');
  });

  it('refuses 28 hours, which the old field accepted', () => {
    const r = exerciseSchema.safeParse(ex({ rest_seconds: '100000' }));
    expect(r.success).toBe(false);
    expect(messages(r)).toContain('Rest cannot be more than 1800 seconds.');
  });

  it('refuses a fraction rather than rounding it', () => {
    expect(exerciseSchema.safeParse(ex({ rest_seconds: '90.5' })).success).toBe(false);
  });

  it('accepts a real rest period', () => {
    expect(exerciseSchema.safeParse(ex({ rest_seconds: '90' })).data!.rest_seconds).toBe(90);
  });
});

describe('the prescription fields stay text, on purpose', () => {
  it.each(['3-4', '8-12 each side', '3-1-1-0', 'AMRAP'])('accepts %j', (v) => {
    const r = exerciseSchema.safeParse(
      ex({ recommended_sets: v, recommended_reps: v, tempo_recommendation: v }),
    );
    expect(r.success).toBe(true);
    expect(r.data!.recommended_sets).toBe(v);
  });

  it('caps their length, so a paste cannot become a prescription', () => {
    expect(exerciseSchema.safeParse(ex({ recommended_sets: 'x'.repeat(41) })).success).toBe(false);
  });
});

describe('identity', () => {
  it('requires a name and a primary muscle', () => {
    expect(exerciseSchema.safeParse(ex({ name: '  ' })).success).toBe(false);
    const noMuscle = exerciseSchema.safeParse(ex({ primary_muscle_id: '' }));
    expect(noMuscle.success).toBe(false);
    expect(messages(noMuscle)).toContain('Primary muscle is required.');
  });

  it('reports an over-long name with the overshoot', () => {
    const r = exerciseSchema.safeParse(ex({ name: 'x'.repeat(121) }));
    expect(r.success).toBe(false);
    expect(messages(r)[0]).toMatch(/currently 121/);
  });

  it.each(DIFFICULTIES)('accepts the %s difficulty', (d) => {
    expect(exerciseSchema.safeParse(ex({ difficulty: d })).success).toBe(true);
  });
});

describe('rebuilding from a stored exercise (§11)', () => {
  it('writes every key, including the ones the record has nothing for', () => {
    const state = exerciseToFormValues({ name: 'Bench Press' });
    const blank = blankExercise();
    expect(Object.keys(state).sort()).toEqual(Object.keys(blank).sort());
    expect(state.trainer_notes).toBe('');
    expect(state.coaching_cues).toEqual([]);
    expect(state.rest_seconds).toBe('');
  });

  it('copies the arrays rather than aliasing the record', () => {
    // Editing the form must not mutate the object it was seeded from — the
    // list is the same reference the caller still holds.
    const record = { name: 'Bench', coaching_cues: ['Brace'] };
    const state = exerciseToFormValues(record);
    state.coaching_cues.push('Retract');
    expect(record.coaching_cues).toEqual(['Brace']);
  });

  it('falls back to beginner for an unrecognised difficulty', () => {
    expect(exerciseToFormValues({ difficulty: 'godlike' }).difficulty).toBe('beginner');
  });

  it('gives each call its own arrays', () => {
    const a = blankExercise();
    const b = blankExercise();
    a.tags.push('legs');
    expect(b.tags).toEqual([]);
  });
});

describe('a restored draft is shape-checked, not cast', () => {
  it('accepts a draft this version wrote', () => {
    expect(isExerciseDraft(blankExercise())).toBe(true);
    expect(isExerciseDraft(ex())).toBe(true);
  });

  it('rejects a draft missing a field this version has', () => {
    // A draft written before a field existed produced `undefined` where a
    // string belongs, and then `undefined.trim()` on save.
    const stale = { ...blankExercise() } as Record<string, unknown>;
    delete stale.trainer_notes;
    expect(isExerciseDraft(stale)).toBe(false);
  });

  it('rejects a draft whose array field holds non-strings', () => {
    const bad = { ...blankExercise(), tags: [1, 2] };
    expect(isExerciseDraft(bad)).toBe(false);
  });

  it('rejects anything that is not an object', () => {
    for (const v of [null, undefined, 'x', 3, []]) {
      expect(isExerciseDraft(v)).toBe(false);
    }
  });
});

describe('the payload', () => {
  it('sends null for every absent optional, and the parsed number for rest', () => {
    const r = exerciseSchema.safeParse(ex({ rest_seconds: '120', tags: ['legs'] }));
    const payload = toExercisePayload(r.data!);
    expect(payload.name).toBe('Landmine Squat');
    expect(payload.rest_seconds).toBe(120);
    expect(payload.description).toBeNull();
    expect(payload.trainer_notes).toBeNull();
    expect(payload.tags).toEqual(['legs']);
  });

  it('never emits undefined, which JSON would drop from the body', () => {
    const r = exerciseSchema.safeParse(ex());
    for (const [k, v] of Object.entries(toExercisePayload(r.data!))) {
      expect(v, `${k} is undefined`).not.toBeUndefined();
    }
  });
});
