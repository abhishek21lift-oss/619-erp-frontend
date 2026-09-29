// Exercise tracking modes: every surface asks lib/training-tracking which
// numbers an exercise is measured in, so a plank is never prescribed as
// "3 × 12 @ kg" and a treadmill run never logged as sets × reps.

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExerciseCard from '@/components/pt-os/builder/ExerciseCard';
import type { WorkoutPlanExercise } from '@/lib/api';
import {
  describePrescription, effectiveMode, formatDuration, kindFields, trackingKind,
} from '@/lib/training-tracking';
import { newDraft, prescriptionOf, setColumns, toLogInput } from '@/components/member/workoutDraft';

const row = (over: Partial<WorkoutPlanExercise>): WorkoutPlanExercise => ({
  id: 'r1', exercise_id: 'e1', name: 'Exercise', muscle_group: 'core',
  sets: 3, reps: 12, rest_seconds: 60, day_of_week: 1, sort_order: 0,
  notes: null, target_weight: null, tempo: null, rpe: null, warmup_sets: null,
  superset_group: null, config: null,
  ...over,
});

describe('trackingKind', () => {
  it.each([
    ['WEIGHT_REPS', 'load_reps'], ['BODYWEIGHT', 'reps'], ['REPS', 'reps'], ['HOLD', 'hold'],
    ['DISTANCE_LOAD', 'carry'], ['TIME_LOAD', 'carry'], ['TIME_SPEED', 'cardio'], ['TIME', 'cardio'],
  ])('%s → %s', (mode, kind) => {
    expect(trackingKind(mode)).toBe(kind);
  });

  it('treats a mode-less exercise as it always behaved: cardio by type, else load × reps', () => {
    expect(trackingKind(null, 'Cardio')).toBe('cardio');
    expect(trackingKind(null, 'Strength')).toBe('load_reps');
    expect(trackingKind('NOT_A_MODE')).toBe('load_reps');
  });
});

describe('effectiveMode', () => {
  const plank = { prescription_mode_primary: 'HOLD', prescription_mode_allowed: ['HOLD', 'TIME', 'BODYWEIGHT'] };

  it('honours a plan row override the exercise allows', () => {
    expect(effectiveMode({ ...plank, config: { tracking_mode: 'BODYWEIGHT' } })).toBe('BODYWEIGHT');
  });

  it('ignores an override the exercise does not allow', () => {
    expect(effectiveMode({ ...plank, config: { tracking_mode: 'DISTANCE_LOAD' } })).toBe('HOLD');
  });
});

describe('describePrescription', () => {
  it('speaks each kind in its own units', () => {
    expect(describePrescription({ kind: 'hold', sets: 3, duration_seconds: 45 })).toBe('3 × 45s');
    expect(describePrescription({ kind: 'carry', sets: 3, distance: 40, target_weight: 32 })).toBe('3 × 40 m @ 32 kg');
    expect(describePrescription({ kind: 'cardio', sets: 1, duration_seconds: 1200, distance: 3, distance_unit: 'km' }))
      .toBe('20 min · 3 km');
    expect(describePrescription({ kind: 'reps', sets: 3, reps: 10, target_weight: 10 })).toBe('3 × 10 +10 kg');
    expect(describePrescription({ kind: 'load_reps', sets: 4, reps: 8, target_weight: 60 })).toBe('4 × 8 @ 60 kg');
  });

  it('formats durations the way a coach writes them', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(120)).toBe('2 min');
    expect(formatDuration(90)).toBe('1 min 30s');
  });

  it('never asks for reps on a hold, a carry or a run', () => {
    for (const k of ['hold', 'carry', 'cardio'] as const) expect(kindFields(k).reps).toBe(false);
    expect(kindFields('cardio').load).toBe('none');
  });
});

describe('builder ExerciseCard by tracking mode', () => {
  it('a lift keeps sets, reps, weight and rest', () => {
    render(<ExerciseCard exercise={row({ prescription_mode_primary: 'WEIGHT_REPS' })} onChange={() => {}} />);
    expect(screen.getByText('Reps')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
  });

  it('a plank asks for a hold in seconds, not reps, and writes it into config', () => {
    const onChange = vi.fn();
    render(
      <ExerciseCard
        exercise={row({
          name: 'Plank', prescription_mode_primary: 'HOLD',
          prescription_mode_allowed: ['HOLD', 'TIME', 'BODYWEIGHT'], config: { drop_sets: 1 },
        })}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText('Reps')).not.toBeInTheDocument();
    const hold = screen.getByLabelText('Hold (s) for Plank');
    fireEvent.change(hold, { target: { value: '45' } });
    fireEvent.blur(hold);
    // The rest of config survives: it is one JSON column.
    expect(onChange).toHaveBeenCalledWith({ config: { drop_sets: 1, duration_seconds: 45 } });
  });

  it('a treadmill run asks for time and distance, stores minutes as seconds', () => {
    const onChange = vi.fn();
    render(
      <ExerciseCard
        exercise={row({ name: 'Running, Treadmill', prescription_mode_primary: 'TIME_SPEED', exercise_type: 'Cardio' })}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText('Weight')).not.toBeInTheDocument();
    const time = screen.getByLabelText('Time (min) for Running, Treadmill');
    fireEvent.change(time, { target: { value: '20' } });
    fireEvent.blur(time);
    expect(onChange).toHaveBeenCalledWith({ config: { duration_seconds: 1200 } });
  });

  it('switching the tracking mode is stored as an override, and cleared when back to default', () => {
    const onChange = vi.fn();
    const ex = row({ name: 'Plank', prescription_mode_primary: 'HOLD', prescription_mode_allowed: ['HOLD', 'BODYWEIGHT'] });
    const { rerender } = render(<ExerciseCard exercise={ex} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Track Plank by'), { target: { value: 'BODYWEIGHT' } });
    expect(onChange).toHaveBeenLastCalledWith({ config: { tracking_mode: 'BODYWEIGHT' } });

    rerender(<ExerciseCard exercise={{ ...ex, config: { tracking_mode: 'BODYWEIGHT' } }} onChange={onChange} />);
    expect(screen.getByText('Reps')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Track Plank by'), { target: { value: 'HOLD' } });
    expect(onChange).toHaveBeenLastCalledWith({ config: null });
  });
});

describe('member guided workout by tracking mode', () => {
  const draftFor = (x: Parameters<typeof newDraft>[0]['exercises'][number]) =>
    newDraft({ title: 'Today', exercises: [x], last: {}, requestId: 'req-12345678' });

  it('prefills a hold with its target seconds and logs seconds, not reps', () => {
    const d = draftFor({
      name: 'Plank', sets: 3, reps: 12, target_weight: null,
      tracking_mode: 'HOLD', target_duration_seconds: 45,
    });
    expect(d.exercises[0].kind).toBe('hold');
    expect(d.exercises[0].prescription).toBe('3 × 45s');
    expect(setColumns('hold').map((c) => c.field)).toEqual(['weight', 'time']);
    d.exercises[0].sets[0].done = true;
    const body = toLogInput(d);
    expect(body.exercises[0].sets).toEqual([{ weight_kg: null, reps: null, duration_seconds: 45 }]);
  });

  it('logs a carry as metres under load and a run as minutes/km converted to seconds/metres', () => {
    const carry = draftFor({
      name: "Farmer's Walk", sets: 2, reps: 12, target_weight: 32,
      tracking_mode: 'DISTANCE_LOAD', target_distance: 40, target_distance_unit: 'm',
    });
    carry.exercises[0].sets[0].done = true;
    expect(toLogInput(carry).exercises[0].sets).toEqual([{ weight_kg: 32, reps: null, distance_m: 40 }]);

    const run = draftFor({
      name: 'Running, Treadmill', sets: null, reps: null, target_weight: null,
      tracking_mode: 'TIME_SPEED', target_duration_seconds: 1200, target_distance: 3, target_distance_unit: 'km',
    });
    expect(run.exercises[0].sets).toHaveLength(1);
    run.exercises[0].sets[0].done = true;
    expect(toLogInput(run).exercises[0].sets).toEqual([
      { weight_kg: null, reps: null, duration_seconds: 1200, distance_m: 3000 },
    ]);
  });

  it('leaves lifts exactly as they were', () => {
    expect(prescriptionOf({ sets: 3, reps: 10, target_weight: 60 })).toBe('3 × 10 · 60 kg');
    const d = draftFor({ name: 'Squat', sets: 1, reps: 5, target_weight: 100 });
    d.exercises[0].sets[0].done = true;
    expect(toLogInput(d).exercises[0].sets).toEqual([{ weight_kg: 100, reps: 5 }]);
  });
});
