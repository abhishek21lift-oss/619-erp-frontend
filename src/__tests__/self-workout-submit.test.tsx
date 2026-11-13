// The submit call is the boundary the server reads: it must receive the
// canonical log payload (weight_kg, reps, seconds, metres), never the UI
// draft's strings. This test pins the call itself, not just toLogInput.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GuidedWorkout from '@/components/member/GuidedWorkout';
import { newDraft } from '@/components/member/workoutDraft';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    me: {
      autosaveWorkout: vi.fn().mockResolvedValue({ data: { saved_at: '2026-11-13T05:00:00.000Z' } }),
      submitWorkout: vi.fn().mockResolvedValue({
        data: {
          created: true,
          session_id: 'ws1',
          summary: {
            total_sets: 1, total_reps: 8, total_volume: 480, exercises_completed: 1,
            exercises_total: 1, avg_rpe: null, planned_sets: 1, completion_pct: 100, prs: 0,
          },
        },
      }),
      logWorkout: vi.fn(),
    },
  },
}));

function draft() {
  return newDraft({
    title: 'Monday · Strength',
    assignment_id: 'a1',
    program_name: 'Strength',
    workout_day: 'Monday',
    exercises: [{ name: 'Squat', sets: 1, reps: 8, target_weight: 60 }],
    last: {},
  });
}

describe('GuidedWorkout submit', () => {
  beforeEach(() => {
    vi.mocked(api.me.submitWorkout).mockClear();
  });

  it('posts the canonical log input, not the UI draft', async () => {
    const initial = draft();
    render(
      <GuidedWorkout
        initial={initial}
        session={{ id: 'ws1', started_at: '2026-11-13T05:00:00.000Z' } as never}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /mark set 1 done/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit workout/i }));

    await waitFor(() => expect(api.me.submitWorkout).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(api.me.submitWorkout).mock.calls[0];
    expect(id).toBe('ws1');
    const set = (body as { exercises: Array<{ sets: Array<Record<string, unknown>> }> }).exercises[0].sets[0];
    expect(set).toMatchObject({ weight_kg: 60, reps: 8 });
    expect(set).not.toHaveProperty('weight');
    expect(set).not.toHaveProperty('done');
  });
});
