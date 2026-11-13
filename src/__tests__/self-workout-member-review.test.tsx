// The member's history is where the trainer's verdict lands. Before this,
// review_feedback was fetched and never shown — the feedback loop ended at the
// API. This pins the two visible facts: the decision, and the note.

import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SessionHistory from '@/components/member/SessionHistory';
import type { MeSession } from '@/lib/api';

const session = {
  id: 'ws1',
  session_date: '2026-11-12',
  program_name: 'Strength',
  workout_day: 'Thursday',
  duration_minutes: 52,
  status: 'completed',
  source: 'member',
  review_status: 'changes_requested',
  review_feedback: 'Good depth — slow the eccentric next time.',
  exercises: [{ name: 'Squat', sets: [{ weight_kg: 60, reps: 8, is_pr: false }] }],
} as unknown as MeSession;

describe('member session history review', () => {
  it('shows the trainer decision and feedback', () => {
    render(<SessionHistory sessions={[session]} />);
    expect(screen.getByText(/changes requested/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /12 Nov|November|2026/i }));
    expect(screen.getByText(/good depth — slow the eccentric next time/i)).toBeInTheDocument();
  });
});
