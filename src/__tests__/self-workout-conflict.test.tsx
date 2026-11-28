// Two things the launcher must not do silently:
//   · resume an open session from another day when the member tapped this one;
//   · pair a local draft with a server session it does not belong to.
// And one it must do: a repeat keeps the mode the exercise was trained in.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WorkoutLauncher from '@/components/member/WorkoutLauncher';
import { newDraft, saveDraft } from '@/components/member/workoutDraft';
import { api } from '@/lib/api';
import type { MeSession, MeWorkoutPlan, MeWorkoutSession } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    me: {
      startWorkout: vi.fn(),
      lastPerformance: vi.fn(),
      discardWorkout: vi.fn(),
      autosaveWorkout: vi.fn(),
      submitWorkout: vi.fn(),
      logWorkout: vi.fn(),
    },
  },
}));

const exercises = [{
  name: 'Squat', sets: 3, reps: 8, rest_seconds: 90, target_weight: 60,
  tempo: null, rpe: null, notes: null, equipment: 'Barbell', media_url: null, video_url: null,
}];

const plan = {
  assignment_id: 'a1', name: 'Strength', description: null, goal: null, difficulty: null,
  duration_weeks: 8, sessions_per_week: 3, start_date: null, end_date: null, current_week: 1,
  days: [{ day_of_week: 1, exercises }, { day_of_week: 3, exercises }],
} as unknown as MeWorkoutPlan;

const openSession = (over: Partial<MeWorkoutSession> = {}): MeWorkoutSession => ({
  id: 'ws1',
  started_at: '2026-11-13T05:00:00.000Z',
  prescribed: { plan_name: 'Strength', current_week: 1, day_of_week: 1, exercises },
  draft: null,
  workout_assignment_id: 'a1',
  program_name: 'Strength',
  workout_day: 'Monday',
  ...over,
});

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(api.me.startWorkout).mockReset();
  vi.mocked(api.me.lastPerformance).mockReset().mockResolvedValue({ data: {} });
  vi.mocked(api.me.discardWorkout).mockReset().mockResolvedValue(undefined);
  vi.mocked(api.me.autosaveWorkout).mockReset()
    .mockResolvedValue({ data: { saved_at: '2026-11-13T05:00:00.000Z' } });
});

describe('starting a day while another session is open', () => {
  it('asks before discarding, then starts the day the member tapped', async () => {
    const start = vi.mocked(api.me.startWorkout);
    start.mockResolvedValueOnce({ data: { session: openSession(), resumed: true, conflict: true } });
    start.mockResolvedValueOnce({
      data: {
        session: openSession({
          id: 'ws2', workout_day: 'Wednesday',
          prescribed: { plan_name: 'Strength', current_week: 1, day_of_week: 3, exercises },
        }),
        resumed: false,
      },
    });
    const onSaved = vi.fn();

    render(
      <WorkoutLauncher plans={[plan]} sessions={[]} allowSelfWorkout
        openSession={openSession()} onSaved={onSaved} today={1} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));

    expect(await screen.findByText(/you have an unfinished monday/i)).toBeInTheDocument();
    expect(start).toHaveBeenCalledWith({ assignment_id: 'a1', day_of_week: 3 });
    expect(api.me.discardWorkout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /discard & start/i }));

    await waitFor(() => expect(api.me.discardWorkout).toHaveBeenCalledWith('ws1'));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(onSaved).toHaveBeenCalled();
  });

  it('resumes the open session without asking when the day matches', async () => {
    const start = vi.mocked(api.me.startWorkout);
    start.mockResolvedValue({ data: { session: openSession(), resumed: true } });

    render(
      <WorkoutLauncher plans={[plan]} sessions={[]} allowSelfWorkout
        openSession={openSession()} onSaved={vi.fn()} today={3} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Monday' }));

    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/you have an unfinished/i)).not.toBeInTheDocument();
    expect(api.me.discardWorkout).not.toHaveBeenCalled();
  });
});

describe('a local draft belongs to its own session', () => {
  it('is not offered as the resume for another open session', () => {
    const stale = {
      ...newDraft({
        title: 'Legacy push', assignment_id: 'a1', program_name: 'Strength',
        workout_day: 'Friday', exercises, last: {},
      }),
      session_id: 'old-session',
    };
    saveDraft(stale);

    render(
      <WorkoutLauncher plans={[plan]} sessions={[]} allowSelfWorkout
        openSession={openSession()} onSaved={vi.fn()} today={1} />,
    );

    const hero = screen.getByRole('button', { name: /resume your workout/i });
    expect(hero).toHaveTextContent('Monday');
    expect(hero).not.toHaveTextContent('Legacy push');
  });
});

describe('repeating a session', () => {
  it('keeps a run a run, with its time and distance targets', async () => {
    const cardio = {
      name: 'Run', sets: 1, reps: null, target_weight: null,
      rest_seconds: null, notes: null, media_url: null, video_url: null,
      tracking_mode: 'TIME_DISTANCE', target_duration_seconds: 1200,
      target_distance: 5, target_distance_unit: 'km',
    };
    const last = {
      id: 'ws-old', session_date: '2026-11-10', program_name: 'Strength', workout_day: 'Tuesday',
      duration_minutes: 25, status: 'completed', source: 'member',
      review_status: null, review_feedback: null,
      exercises: [{
        name: 'Run', tracking_mode: 'TIME_DISTANCE', target_duration_seconds: 1200,
        target_distance: 5, target_distance_unit: 'km',
        sets: [{
          set_number: 1, weight_kg: null, reps: null, rpe: 6, completed: true, is_pr: false,
          duration_seconds: 1200, distance: 5, distance_unit: 'km',
        }],
      }],
    } as unknown as MeSession;

    vi.mocked(api.me.startWorkout).mockResolvedValue({
      data: {
        session: openSession({
          id: 'ws9', workout_day: 'Tuesday',
          prescribed: { plan_name: 'Strength', current_week: 1, day_of_week: 2, exercises: [cardio] },
        }),
        resumed: false,
      },
    });

    render(
      <WorkoutLauncher plans={[plan]} sessions={[last]} allowSelfWorkout
        openSession={null} onSaved={vi.fn()} today={5} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /repeat your last session/i }));

    expect(await screen.findByLabelText('Set 1 minutes', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByLabelText('Set 1 kilometres')).toBeInTheDocument();
  });
});
