// The trainer decides whether a member may start a workout alone. This test
// pins the two visible rules: no Start when the permission is off, and Resume
// still offered for a workout the member already started.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkoutLauncher from '@/components/member/WorkoutLauncher';
import type { MeWorkoutPlan, MeWorkoutSession } from '@/lib/api';

/** 1 = Monday … 7 = Sunday, the same mapping the app uses. */
const today = (() => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
})();

const exercises = [{
  name: 'Squat', sets: 3, reps: 8, rest_seconds: 90, target_weight: 60,
  tempo: null, rpe: null, notes: null, equipment: 'Barbell', media_url: null, video_url: null,
}];

const plan = {
  assignment_id: 'a1', name: 'Strength', description: null, goal: null, difficulty: null,
  duration_weeks: 8, sessions_per_week: 3, start_date: null, end_date: null, current_week: 1,
  days: [{ day_of_week: today, exercises }],
} as unknown as MeWorkoutPlan;

const open: MeWorkoutSession = {
  id: 'ws1',
  started_at: new Date().toISOString(),
  prescribed: { plan_name: 'Strength', current_week: 1, day_of_week: today, exercises },
  draft: null,
  workout_assignment_id: 'a1',
  program_name: 'Strength',
  workout_day: 'Monday',
};

beforeEach(() => window.localStorage.clear());

describe('WorkoutLauncher permission', () => {
  it('shows no start action when permission is off', () => {
    render(<WorkoutLauncher plans={[plan]} sessions={[]} allowSelfWorkout={false} openSession={null} onSaved={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /start today's workout/i })).not.toBeInTheDocument();
  });

  it('shows Resume for an open session even when permission is off', () => {
    render(<WorkoutLauncher plans={[plan]} sessions={[]} allowSelfWorkout={false} openSession={open} onSaved={vi.fn()} />);
    expect(screen.getByRole('button', { name: /resume your workout/i })).toBeInTheDocument();
  });
});
