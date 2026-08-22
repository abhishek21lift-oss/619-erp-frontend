// ExerciseCard's read-only mode, and the progression ramp line.
//
// ── A note on what this used to be ────────────────────────────────────────
//
// This file was called "a generated week must not be editable". That was the
// old model: weeks 2..N had no rows of their own, so a card in week 6 carried
// week 1's row id and a live input there would have PATCHed week 1 — one
// keystroke in week 6 moving weeks 2 through 12 with it.
//
// That is no longer how the builder works. Every week is editable; the first
// edit to a computed week makes the server write that week out and land the
// edit on its own row (see workout-builder-weeks.test.tsx and the backend's
// workouts.weeks.test.js). So this file no longer describes a rule about
// weeks — it describes the component's read-only mode, which is still a real
// capability worth holding to its contract: show every number, offer nothing
// that writes.
//
// The ramp line below is unchanged and always was about the ramp.

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExerciseCard from '@/components/pt-os/builder/ExerciseCard';
import type { WorkoutPlanExercise } from '@/lib/api';

const SQUAT: WorkoutPlanExercise = {
  id: 'ex-1',
  exercise_id: 'lib-1',
  name: 'Barbell Back Squat',
  muscle_group: 'legs',
  sets: 4,
  reps: 8,
  rest_seconds: 90,
  day_of_week: 1,
  sort_order: 0,
  notes: 'Brace before you unrack.',
  target_weight: 60,
  tempo: '3-1-2-0',
  rpe: 8,
  warmup_sets: 2,
  superset_group: null,
  config: null,
};

describe('ExerciseCard in read-only mode', () => {
  it('renders no inputs at all', () => {
    const { container } = render(<ExerciseCard exercise={SQUAT} readOnly />);
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('still shows every prescribed number — read-only is not hidden', () => {
    // The whole point of opening week 6 is to see what it prescribes. A guard
    // that protected the data by showing nothing would defeat the feature.
    render(<ExerciseCard exercise={SQUAT} readOnly />);
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
    expect(screen.getByText('Brace before you unrack.')).toBeInTheDocument();
  });

  it('drops the destructive actions with the inputs', () => {
    // Duplicate and Remove write to the plan, not to a week. Offering them
    // from a preview would let a trainer delete week 1's exercise while
    // looking at week 6.
    render(<ExerciseCard exercise={SQUAT} readOnly />);
    expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /duplicate/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /reorder/i })).toBeNull();
  });

  it('is editable and reports changes when NOT read-only', () => {
    // The negative case matters as much: a guard that is always on would make
    // the builder itself read-only, and every test above would still pass.
    const onChange = vi.fn();
    render(<ExerciseCard exercise={SQUAT} onChange={onChange} />);
    const sets = screen.getByDisplayValue('4');
    fireEvent.change(sets, { target: { value: '5' } });
    fireEvent.blur(sets);                    // the card commits on blur, not per keystroke
    expect(onChange).toHaveBeenCalledWith({ sets: 5 });
  });
});

describe('the progression ramp line', () => {
  /** Week 1 defaults to SQUAT's own numbers, which is what a real preview is. */
  const preview = (last: Record<string, number | null>, first: Record<string, number | null> = {}) => ({
    id: 'ex-1',
    first: { week: 1, target_weight: 60, reps: 8, rpe: 8, ...first },
    last: { week: 12, target_weight: 60, reps: 8, rpe: 8, ...last },
  });

  it('shows where the rule lands, which is the only reason to show it', () => {
    render(<ExerciseCard exercise={SQUAT} readOnly preview={preview({ target_weight: 87.5 })} />);
    // 60 kg to 87.5 kg over twelve weeks is a decision a trainer may want to
    // reverse — much cheaper to learn here than in week 9.
    expect(screen.getByText(/W1 60/)).toBeInTheDocument();
    expect(screen.getByText('87.5')).toBeInTheDocument();
  });

  it('says nothing when the rule does not move this exercise', () => {
    // A bodyweight exercise under a weight rule is not progressed at all —
    // the resolver refuses to invent a load the trainer never set. "60 → 60"
    // would be noise, and a fabricated start weight would be worse.
    const { container } = render(<ExerciseCard exercise={SQUAT} readOnly preview={preview({})} />);
    expect(container.textContent).not.toMatch(/W1 .* → W12/);
  });

  it('reports the reps ramp, in reps, when reps are what moved', () => {
    const { container } = render(<ExerciseCard exercise={SQUAT} readOnly preview={preview({ reps: 14 })} />);
    expect(screen.getByText(/W1 8 → W12/)).toBeInTheDocument();
    // The unit has to follow the measure. "8 → 14 kg" would be a prescription
    // nobody wrote, on the exercise the trainer is reading right now.
    expect(container.textContent).toMatch(/W1 8 → W12\s*14\s*reps/);
  });

  it('goes silent when the exercise has moved on from what the ramp was computed from', () => {
    // The preview comes from the server and describes the numbers as they were
    // when the plan was fetched. Retype the squat as 80 kg and "W1 60 → W12
    // 87.5" becomes a prescription for a weight this exercise no longer
    // carries — rendered directly under the field that contradicts it.
    const edited = { ...SQUAT, target_weight: 80 };
    const { container } = render(
      <ExerciseCard exercise={edited} readOnly preview={preview({ target_weight: 87.5 })} />,
    );
    expect(container.textContent).not.toMatch(/W1 60/);
  });
});
