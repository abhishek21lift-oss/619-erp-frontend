// A member submitted a workout; the trainer approves it or asks for changes.
// The panel shows the prescription beside what was actually done, and what
// was missed, before the decision is made.

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ReviewPanel from '@/components/pt-os/workout-log/ReviewPanel';
import type { WorkoutSessionDetail } from '@/lib/api';

const detail = {
  id: 'ws1',
  client_id: 'c1',
  session_date: '2026-11-13',
  status: 'completed',
  source: 'member',
  review_status: 'pending',
  duration_minutes: 52,
  created_at: '2026-11-13T05:00:00.000Z',
  updated_at: '2026-11-13T06:00:00.000Z',
  exercises: [{
    id: 'e1', session_id: 'ws1', exercise_name: 'Squat', sort_order: 0,
    sets: [{
      id: 's1', session_exercise_id: 'e1', set_number: 1, weight_kg: 60, reps: 8,
      rpe: 8, rir: 2, completed: true, notes: 'smooth',
      is_pr_weight: false, is_pr_reps: false, is_pr_volume: false,
      created_at: '', updated_at: '',
    }],
  }],
  summary: {
    total_sets: 1, total_reps: 8, total_volume: 480, exercises_completed: 1,
    exercises_total: 1, avg_rpe: 8,
  },
  planned: {
    plan_id: 'p1', plan_name: 'Strength', day_of_week: 1, week: 1,
    exercises: [{ exercise_id: 'x', name: 'Squat', sets: 3, reps: 8, rest_seconds: 90 }],
  },
} as unknown as WorkoutSessionDetail;

describe('ReviewPanel', () => {
  it('shows planned vs actual and submits feedback', async () => {
    const api = { reviewSession: vi.fn().mockResolvedValue({}) };
    render(<ReviewPanel detail={detail} onReviewed={vi.fn()} api={api} />);

    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('Actual')).toBeInTheDocument();
    expect(screen.getByText('Missed')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/feedback/i), { target: { value: 'Good depth' } });
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    expect(api.reviewSession).toHaveBeenCalledWith('ws1', { decision: 'approved', feedback: 'Good depth' });
  });
});
