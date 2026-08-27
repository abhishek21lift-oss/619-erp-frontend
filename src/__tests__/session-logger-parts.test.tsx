// The pieces of the session logger, tested where the logic actually lives.
//
// Three of these are pure functions with real consequences: which form an
// exercise gets, what the next set's fields hold, and what a duration in
// minutes and seconds becomes on the wire. The fourth is the rest timer, whose
// only interesting property is that it reads a clock instead of counting.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { pickLoggerShape, prescriptionsByExercise } from '@/lib/training/loggerShape';
import { prefillFrom, buildSetPayload } from '@/components/pt-os/training/SetLogger';
import {
  buildCardioPayload, durationSeconds, emptyCardioDraft, describeEffort,
  guessCardioType, cardioTypeLabel, type CardioDraft,
} from '@/components/pt-os/training/CardioLogger';
import RestTimer, { remainingSeconds, formatClock } from '@/components/pt-os/training/RestTimer';
import {
  appendOptimistic, mergeServer, removeByToken, replaceByToken,
  type LoggerPerformance,
} from '@/lib/training/useSessionLogger';
import type { PrescriptionTypeMeta, TemplateExercise } from '@/lib/api';

const TYPES = [
  { type: 'SETS_REPS', logs_as: 'sets', required: [], optional: [], fields: [] },
  { type: 'TIME', logs_as: 'cardio', required: [], optional: [], fields: [] },
  { type: 'CUSTOM', logs_as: 'either', required: [], optional: [], fields: [] },
] as unknown as PrescriptionTypeMeta[];

const perf = (over: Partial<LoggerPerformance> = {}): LoggerPerformance => ({
  id: 'perf-1', session_id: 's1', exercise_id: 'ex-1', exercise_name: 'Back Squat',
  section: 'MAIN', order_index: 0, status: 'PENDING', sets: [], cardio: [], ...over,
} as LoggerPerformance);

describe('which logger an exercise gets', () => {
  it('follows what has already been logged, over anything prescribed', async () => {
    // Data beats intent: an exercise with cardio rows is a cardio exercise
    // even if someone later prescribed it as sets.
    const withCardio = perf({ cardio: [{ id: 'c1' }] as never });
    expect(pickLoggerShape(withCardio, { prescription_type: 'SETS_REPS' }, TYPES)).toBe('cardio');

    const withSets = perf({ section: 'CARDIO', sets: [{ id: 's1' }] as never });
    expect(pickLoggerShape(withSets, undefined, TYPES)).toBe('sets');
  });

  it('asks the server what a prescription type logs as', async () => {
    expect(pickLoggerShape(perf(), { prescription_type: 'TIME' }, TYPES)).toBe('cardio');
    expect(pickLoggerShape(perf({ section: 'CARDIO' }), { prescription_type: 'SETS_REPS' }, TYPES)).toBe('sets');
  });

  it('falls back to the section when the type says "either"', async () => {
    // CUSTOM genuinely can be logged both ways; forcing it would be a guess
    // dressed as a rule.
    expect(pickLoggerShape(perf({ section: 'CARDIO' }), { prescription_type: 'CUSTOM' }, TYPES)).toBe('cardio');
    expect(pickLoggerShape(perf({ section: 'MAIN' }), { prescription_type: 'CUSTOM' }, TYPES)).toBe('sets');
  });

  it('treats a bare cardio-section exercise as cardio', async () => {
    expect(pickLoggerShape(perf({ section: 'CONDITIONING' }), undefined, TYPES)).toBe('cardio');
    expect(pickLoggerShape(perf({ section: 'ACCESSORY' }), undefined, TYPES)).toBe('sets');
  });

  it('defaults to sets, because most exercises are', async () => {
    expect(pickLoggerShape(perf({ section: null }), undefined, TYPES)).toBe('sets');
  });
});

describe('matching prescriptions to performances', () => {
  it('keys by exercise, not by position', () => {
    const rows = [
      { id: 'r1', exercise_id: 'ex-a', target_sets: 3 },
      { id: 'r2', exercise_id: 'ex-b', target_sets: 5 },
    ] as TemplateExercise[];
    const map = prescriptionsByExercise(rows);
    expect(map.get('ex-b')?.target_sets).toBe(5);
    expect(map.get('ex-c')).toBeUndefined();
  });

  it('keeps the first of a repeated movement, not the last', () => {
    // Heavy singles then a back-off block is a real programme. Last-wins would
    // show the back-off targets against the heavy sets.
    const rows = [
      { id: 'r1', exercise_id: 'ex-a', target_weight: 140 },
      { id: 'r2', exercise_id: 'ex-a', target_weight: 100 },
    ] as TemplateExercise[];
    expect(prescriptionsByExercise(rows).get('ex-a')?.target_weight).toBe(140);
  });
});

describe('what the next set holds', () => {
  it('repeats the last set logged', () => {
    const sets = [{ actual_reps: 8, actual_weight: 100, actual_rpe: 8 }] as never;
    expect(prefillFrom(sets, { target_reps_min: 12 })).toEqual({ reps: '8', weight: '100', rpe: '8' });
  });

  it('repeats a set that has not been sent yet', () => {
    // "Same again" means the same as what I just did, not the same as what the
    // server has acknowledged.
    const sets = [{ actual_reps: 5, actual_weight: 60, actual_rpe: null, pending: true }] as never;
    expect(prefillFrom(sets, undefined)).toEqual({ reps: '5', weight: '60', rpe: '' });
  });

  it('falls back to the prescription for the first set', () => {
    expect(prefillFrom([], { target_reps_min: 10, target_weight: 40, target_rpe: 7 }))
      .toEqual({ reps: '10', weight: '40', rpe: '7' });
  });

  it('is empty when there is neither', () => {
    expect(prefillFrom([], undefined)).toEqual({ reps: '', weight: '', rpe: '' });
  });

  it('sends a blank field as null, not as zero', () => {
    // Zero reps is a claim; blank is an absence. Recording the first as the
    // second poisons every average built on the column.
    const payload = buildSetPayload({ reps: '10', weight: '', rpe: '' }, 2, 'kg');
    expect(payload).toMatchObject({
      set_number: 2, actual_reps: 10, actual_weight: null, actual_rpe: null, weight_unit: 'kg',
    });
  });
});

describe('cardio entry', () => {
  it('turns minutes and seconds into one duration', () => {
    expect(durationSeconds({ minutes: '21', seconds: '10' })).toBe(1270);
    expect(durationSeconds({ minutes: '', seconds: '45' })).toBe(45);
    expect(durationSeconds({ minutes: '2', seconds: '' })).toBe(120);
  });

  it('reports no duration at all rather than a zero-second effort', () => {
    expect(durationSeconds({ minutes: '', seconds: '' })).toBeNull();
  });

  it('drops the unit when no distance was entered', () => {
    const draft: CardioDraft = {
      minutes: '20', seconds: '', distance: '', distanceUnit: 'km',
      heartRate: '', calories: '', rpe: '',
    };
    expect(buildCardioPayload(draft, 'TREADMILL')).toMatchObject({
      duration_seconds: 1200, distance: null, distance_unit: null, cardio_type: 'TREADMILL',
    });
  });

  it('never emits sets or reps', () => {
    // The modelling error this whole rewrite exists to undo.
    const draft = emptyCardioDraft({ target_duration_seconds: 600 } as TemplateExercise);
    const payload = buildCardioPayload(draft, 'ROWING');
    expect(payload).not.toHaveProperty('set_number');
    expect(payload).not.toHaveProperty('actual_reps');
    expect(payload).not.toHaveProperty('actual_weight');
  });

  it('seeds the form from the prescribed duration', () => {
    expect(emptyCardioDraft({ target_duration_seconds: 630 } as TemplateExercise))
      .toMatchObject({ minutes: '10', seconds: '30' });
    expect(emptyCardioDraft({ target_duration_seconds: 600 } as TemplateExercise))
      .toMatchObject({ minutes: '10', seconds: '' });
  });

  it('guesses the modality from the exercise name', () => {
    // cardio_type is what makes "am I running faster than in March"
    // answerable; defaulting everything to OTHER answers it with silence.
    expect(guessCardioType('Treadmill Run')).toBe('TREADMILL');
    expect(guessCardioType('Concept2 Row')).toBe('ROWING');
    expect(guessCardioType('Assault Bike Intervals')).toBe('STATIONARY_BIKE');
    expect(guessCardioType('Outdoor Cycling')).toBe('CYCLING');
    expect(guessCardioType('Ski Erg')).toBe('SKI_ERG');
    expect(guessCardioType('Farmer Carry')).toBe('OTHER');
  });

  it('labels a type without shouting', () => {
    expect(cardioTypeLabel('SKI_ERG')).toBe('Ski Erg');
    expect(cardioTypeLabel('ROWING')).toBe('Rowing');
  });

  it('reads an effort back the way a person would say it', () => {
    expect(describeEffort({
      duration_seconds: 1270, distance: 5, distance_unit: 'km', calories_burned: 310, rpe: 7,
    })).toBe('21:10 · 5km · 310 kcal · RPE 7');
    expect(describeEffort({
      duration_seconds: null, distance: null, distance_unit: null, calories_burned: null, rpe: null,
    })).toBe('Logged');
  });
});

describe('the rest timer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('computes what is left from the clock', () => {
    expect(remainingSeconds(10_000, 0)).toBe(10);
    expect(remainingSeconds(10_000, 7_400)).toBe(3);
    expect(remainingSeconds(10_000, 99_000)).toBe(0);
  });

  it('formats as minutes and seconds', () => {
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(0)).toBe('0:00');
  });

  it('is correct after the phone was locked, not merely lower', () => {
    // A counting timer misses throttled ticks and comes back showing 90
    // seconds left when three minutes have passed. This one asks the clock.
    let now = 0;
    render(<RestTimer seconds={120} now={() => now} />);
    expect(screen.getByRole('timer').textContent).toContain('2:00');

    // Time passes with the tab asleep: one tick fires, not four hundred.
    now = 118_000;
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.getByRole('timer').textContent).toContain('0:02');
  });

  it('announces completion once, not on every tick', () => {
    let now = 0;
    const onDone = vi.fn();
    render(<RestTimer seconds={30} now={() => now} onDone={onDone} />);
    now = 31_000;
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('holds the remaining time across a pause', () => {
    let now = 0;
    render(<RestTimer seconds={60} now={() => now} />);
    now = 20_000;
    act(() => { vi.advanceTimersByTime(250); });
    fireEvent.click(screen.getByLabelText('Pause rest timer'));

    // Twenty seconds pass while paused; the display must not move.
    now = 40_000;
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.getByRole('timer').textContent).toContain('0:40');

    fireEvent.click(screen.getByLabelText('Resume rest timer'));
    now = 45_000;
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.getByRole('timer').textContent).toContain('0:35');
  });
});

describe('optimistic rows', () => {
  it('shows a set immediately, marked as not yet sent', () => {
    const next = appendOptimistic([perf()], 'perf-1', 'set', 'tok-1', { actual_reps: 10 });
    expect(next[0].sets).toHaveLength(1);
    expect(next[0].sets[0]).toMatchObject({ actual_reps: 10, set_number: 1, pending: true, token: 'tok-1' });
  });

  it('leaves other exercises alone', () => {
    const other = perf({ id: 'perf-2' });
    const next = appendOptimistic([perf(), other], 'perf-1', 'set', 'tok-1', {});
    expect(next[1].sets).toHaveLength(0);
  });

  it('replaces the optimistic row with the server row on acknowledgement', () => {
    const withPending = appendOptimistic([perf()], 'perf-1', 'set', 'tok-1', { actual_reps: 10 });
    const next = replaceByToken(withPending, 'tok-1', 'set', { id: 'real-1', actual_reps: 10, set_number: 1 });
    expect(next[0].sets).toHaveLength(1);
    expect(next[0].sets[0].id).toBe('real-1');
    expect(next[0].sets[0].pending).toBeUndefined();
  });

  it('takes the row away when the server refuses it', () => {
    // Leaving it on screen would claim a set was recorded that was rejected.
    const withPending = appendOptimistic([perf()], 'perf-1', 'cardio', 'tok-2', { duration_seconds: 600 });
    expect(removeByToken(withPending, 'tok-2')[0].cardio).toHaveLength(0);
  });

  it('keeps a queued set through a refetch', () => {
    // A reload mid-workout must not erase the set logged two seconds ago that
    // is still waiting to send.
    const withPending = appendOptimistic([perf()], 'perf-1', 'set', 'tok-1', { actual_reps: 10 });
    const fromServer = [{ ...perf(), sets: [{ id: 'real-0', set_number: 1 }], cardio: [] }] as never;
    const merged = mergeServer(fromServer, withPending);
    expect(merged[0].sets.map((s) => s.id)).toEqual(['real-0', 'pending:tok-1']);
  });

  it('drops the optimistic copy once the server reports it', () => {
    const acknowledged = replaceByToken(
      appendOptimistic([perf()], 'perf-1', 'set', 'tok-1', {}), 'tok-1', 'set', { id: 'real-1' },
    );
    const fromServer = [{ ...perf(), sets: [{ id: 'real-1', set_number: 1 }], cardio: [] }] as never;
    expect(mergeServer(fromServer, acknowledged)[0].sets).toHaveLength(1);
  });
});
