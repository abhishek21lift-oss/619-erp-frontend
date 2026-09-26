import { beforeEach, describe, expect, it } from 'vitest';
import {
  DRAFT_KEY, beatsBest, firstInt, lastSummary, loadDraft, newDraft, prefillSets, saveDraft, toLogInput,
  volumeOf, type WorkoutDraft,
} from '@/components/member/workoutDraft';
import {
  favouriteDay, headlineStats, isEmptyMonth, monthName, previousMonthOf, slidesFor, versus, weightTotal,
} from '@/components/member/recap';
import { memberGoalSchema, toMemberGoalPayload } from '@/lib/forms/schemas/memberGoal';
import type { MeRecap } from '@/lib/api';

// ── Guided workout draft ─────────────────────────────────────────────────────

describe('prefillSets', () => {
  const last = {
    date: '2026-09-20',
    sets: [{ weight_kg: 60, reps: 8, duration_seconds: null }, { weight_kg: 65, reps: 6, duration_seconds: null }],
    best_kg: 70,
  };

  it('takes each set\'s weight from the same set last time, then the last one', () => {
    const sets = prefillSets({ sets: 3, reps: '8-10', target_weight: 50 }, last);
    expect(sets.map((s) => s.weight)).toEqual(['60', '65', '65']);
    expect(sets.map((s) => s.reps)).toEqual(['8', '8', '8']);
    expect(sets.every((s) => !s.done)).toBe(true);
  });

  it('falls back to the trainer\'s target, and to blanks', () => {
    expect(prefillSets({ sets: 2, reps: 12, target_weight: 20 }, undefined).map((s) => [s.weight, s.reps]))
      .toEqual([['20', '12'], ['20', '12']]);
    expect(prefillSets({ sets: null, reps: null, target_weight: null }, undefined))
      .toEqual(Array(3).fill({ weight: '', reps: '', done: false }));
  });

  it('parses the first number of a rep range', () => {
    expect(firstInt('8-10')).toBe(8);
    expect(firstInt('AMRAP')).toBeNull();
    expect(firstInt(null)).toBeNull();
  });
});

describe('the finished workout', () => {
  const draft = (): WorkoutDraft => newDraft({
    title: 'Monday · Strength',
    assignment_id: 'a1',
    program_name: 'Strength',
    workout_day: 'Monday',
    exercises: [
      { name: 'Squat', sets: 2, reps: 5, target_weight: 100 },
      { name: 'Plank', sets: 1, reps: null, target_weight: null },
    ],
    last: {},
    now: new Date('2026-09-26T10:00:00Z'),
    requestId: 'req-test-0001',
  });

  it('sends ticked sets only, and drops exercises with none', () => {
    const d = draft();
    d.exercises[0].sets[0].done = true;
    const body = toLogInput(d, new Date('2026-09-26T10:47:00Z'));
    expect(body).toEqual({
      request_id: 'req-test-0001',
      assignment_id: 'a1',
      program_name: 'Strength',
      workout_day: 'Monday',
      duration_minutes: 47,
      exercises: [{ name: 'Squat', sets: [{ weight_kg: 100, reps: 5 }] }],
    });
    expect(volumeOf(d)).toBe(500);
  });

  it('does not count a ticked set with no reps', () => {
    const d = draft();
    d.exercises[0].sets[0] = { weight: '100', reps: '', done: true };
    expect(toLogInput(d).exercises).toEqual([]);
  });

  it('calls a set a new best only when it beats a real previous best', () => {
    expect(beatsBest({ weight: '72.5', reps: '3', done: true }, 70)).toBe(true);
    expect(beatsBest({ weight: '70', reps: '3', done: true }, 70)).toBe(false);
    expect(beatsBest({ weight: '40', reps: '3', done: true }, null)).toBe(false);
  });

  it('summarises last time', () => {
    expect(lastSummary({ date: 'x', best_kg: 65, sets: [
      { weight_kg: 60, reps: 8, duration_seconds: null }, { weight_kg: null, reps: 12, duration_seconds: null },
      { weight_kg: null, reps: null, duration_seconds: 600 },
    ] })).toBe('60 kg × 8, 12 reps, 10 min');
  });
});

describe('the saved draft', () => {
  beforeEach(() => window.localStorage.clear());

  it('survives a reload', () => {
    const d = newDraft({ title: 'T', exercises: [{ name: 'Row', sets: 1, reps: 10, target_weight: 40 }], last: {} });
    saveDraft(d);
    expect(loadDraft()?.request_id).toBe(d.request_id);
  });

  it('is dropped when stale or malformed', () => {
    const d = newDraft({ title: 'T', exercises: [{ name: 'Row', sets: 1, reps: 10, target_weight: 40 }], last: {}, now: new Date('2026-01-01T00:00:00Z') });
    saveDraft(d);
    expect(loadDraft(new Date('2026-01-02T00:00:00Z'))).toBeNull();
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
    window.localStorage.setItem(DRAFT_KEY, '{nope');
    expect(loadDraft()).toBeNull();
  });
});

// ── Monthly recap ────────────────────────────────────────────────────────────

const recap = (over: Partial<MeRecap> = {}): MeRecap => ({
  month: '2026-08',
  months: ['2026-09', '2026-08'],
  in_progress: false,
  first_name: 'Mina',
  studio_name: '619 Fitness',
  studio_logo: null,
  totals: {
    sessions: 12, training_days: 11, active_weeks: 4, self_logged: 2, visits: 3, checkins: 0,
    sets: 180, reps: 1400, volume_kg: 18420, cardio_minutes: 0,
  },
  previous: { sessions: 8, volume_kg: 12000, training_days: 8 },
  top_lift: { exercise: 'Deadlift', weight_kg: 120, reps: 3, date: '2026-08-21' },
  favourite: { exercise: 'Bench press', sets: 24 },
  records: [{ exercise: 'Deadlift', weight_kg: 120, reps: 3, date: '2026-08-21', kind: 'weight' }],
  weekdays: [3, 0, 3, 0, 4, 1, 0],
  weight: null,
  ...over,
});

describe('recap formatting', () => {
  it('names months, with the year only when it is not this year', () => {
    expect(monthName('2026-08', new Date('2026-09-26'))).toBe('August');
    expect(monthName('2025-12', new Date('2026-09-26'))).toBe('December 2025');
    expect(previousMonthOf('2026-01')).toBe('2025-12');
  });

  it('formats totals and comparisons honestly', () => {
    expect(weightTotal(18420)).toEqual({ value: '18.4', unit: 'tonnes' });
    expect(weightTotal(950)).toEqual({ value: '950', unit: 'kg' });
    expect(versus(12, 8, '2026-07')).toMatch(/^\+4 vs /);
    expect(versus(5, 0, '2026-07')).toBeNull();
  });

  it('names a favourite day only when one stands out', () => {
    expect(favouriteDay([3, 0, 3, 0, 4, 1, 0])).toBe('Friday');
    expect(favouriteDay([2, 2, 0, 0, 0, 0, 0])).toBeNull();
    expect(favouriteDay([0, 0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it('shows only the slides the month earned', () => {
    expect(slidesFor(recap())).toEqual(['intro', 'sessions', 'rhythm', 'volume', 'top', 'records', 'favourite', 'summary']);
    const thin = recap({
      totals: { ...recap().totals, sessions: 0, sets: 0, reps: 0, volume_kg: 0, active_weeks: 0, training_days: 0 },
      top_lift: null, favourite: null, records: [], weekdays: [0, 0, 0, 0, 0, 0, 0],
    });
    expect(slidesFor(thin)).toEqual(['intro', 'sessions', 'summary']);
    expect(isEmptyMonth(thin)).toBe(false);
    expect(isEmptyMonth(recap({ totals: { ...thin.totals, visits: 0 } }))).toBe(true);
  });

  it('leads the share card with the strongest four figures', () => {
    expect(headlineStats(recap())).toEqual([
      { label: 'Sessions', value: '12' },
      { label: 'Tonnes lifted', value: '18.4' },
      { label: 'Record broken', value: '1' },
      { label: 'Sets', value: '180' },
    ]);
  });
});

// ── Goal form ────────────────────────────────────────────────────────────────

describe('the new-goal form', () => {
  const now = new Date(2026, 8, 26);
  const parse = (v: Record<string, string>) => memberGoalSchema(now).safeParse({ kind: 'lift', exercise: '', target: '', targetDate: '', ...v });

  it('requires an exercise for a lift, and a whole number of sessions', () => {
    expect(parse({ target: '100' }).success).toBe(false);
    expect(parse({ kind: 'sessions', target: '2.5' }).success).toBe(false);
    expect(parse({ kind: 'weight', target: '10' }).success).toBe(false);
  });

  it('refuses a date that is not in the future', () => {
    expect(parse({ exercise: 'Squat', target: '100', targetDate: '2026-09-26' }).success).toBe(false);
  });

  it('sends only what applies', () => {
    const ok = parse({ exercise: 'Squat', target: '100', targetDate: '2026-12-01' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(toMemberGoalPayload(ok.data)).toEqual({ kind: 'lift', target_value: 100, exercise_name: 'Squat', target_date: '2026-12-01' });
    const sessions = parse({ kind: 'sessions', exercise: 'ignored', target: '20' });
    if (sessions.success) expect(toMemberGoalPayload(sessions.data)).toEqual({ kind: 'sessions', target_value: 20 });
  });
});
